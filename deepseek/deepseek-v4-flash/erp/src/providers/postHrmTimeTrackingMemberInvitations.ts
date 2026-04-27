import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingInvitationCollector } from "../collectors/HrmTimeTrackingInvitationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingInvitationTransformer } from "../transformers/HrmTimeTrackingInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberInvitations(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingInvitation.ICreate;
}): Promise<IHrmTimeTrackingInvitation> {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Find employee record for authenticated member to determine
  //    organization context
  // ──────────────────────────────────────────────────────────────────────────
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_organization_id: true,
      hrm_time_tracking_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Organization not found", 404);
  }
  // ──────────────────────────────────────────────────────────────────────────
  // 2. Verify the employee's role grants "employee:manage" permission
  // ──────────────────────────────────────────────────────────────────────────
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "employee:manage",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // ──────────────────────────────────────────────────────────────────────────
  // 3. Validate the role_id from the request body belongs to the current
  //    organization (cross-org role assignment rejected)
  // ──────────────────────────────────────────────────────────────────────────
  const roleRecord = await MyGlobal.prisma.hrm_time_tracking_roles.findFirst({
    where: {
      id: props.body.role_id,
      hrm_time_tracking_organization_id:
        employee.hrm_time_tracking_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (roleRecord === null) {
    throw new HttpException("Role not found", 404);
  }
  const organizationId: string = employee.hrm_time_tracking_organization_id;
  // ──────────────────────────────────────────────────────────────────────────
  // 4. Look up the invited email in the members table
  // ──────────────────────────────────────────────────────────────────────────
  const existingMember =
    await MyGlobal.prisma.hrm_time_tracking_members.findUnique({
      where: { email: props.body.email },
      select: { id: true },
    });
  // ──────────────────────────────────────────────────────────────────────────
  // 5. BRANCH A — Invited email belongs to an existing registered member
  //    → Auto-create employee + accepted invitation + activity log
  // ──────────────────────────────────────────────────────────────────────────
  if (existingMember !== null) {
    // 5a. Prevent duplicate: check no active employee record exists for
    //     this member+org combination
    const existingEmployee =
      await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
        where: {
          hrm_time_tracking_member_id: existingMember.id,
          hrm_time_tracking_organization_id: organizationId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (existingEmployee !== null) {
      throw new HttpException("Already a member", 409);
    }
    const now: string = new Date().toISOString();
    const employeeId: string = v4();
    // 5b. Create employee record with active status and full-time default
    await MyGlobal.prisma.hrm_time_tracking_employees.create({
      data: {
        id: employeeId,
        member: { connect: { id: existingMember.id } },
        role: { connect: { id: props.body.role_id } },
        organization: { connect: { id: organizationId } },
        status: "active",
        employment_type: "full-time",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // 5c. Create accepted invitation (manual, not via pending collector)
    const invitationRecord =
      await MyGlobal.prisma.hrm_time_tracking_invitations.create({
        data: {
          id: v4(),
          email: props.body.email,
          status: "accepted",
          expired_at: null,
          accepted_at: now,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          organization: { connect: { id: organizationId } },
          inviter: { connect: { id: props.member.id } },
          acceptor: { connect: { id: existingMember.id } },
          role: { connect: { id: props.body.role_id } },
        },
        ...HrmTimeTrackingInvitationTransformer.select(),
      });
    // 5d. Record activity log entry with type 'employee.invited'
    const activityLogType =
      await MyGlobal.prisma.hrm_time_tracking_activity_log_types.findFirst({
        where: { code: "employee.invited" },
        select: { id: true },
      });
    if (activityLogType !== null) {
      await MyGlobal.prisma.hrm_time_tracking_activity_logs.create({
        data: {
          id: v4(),
          organization: { connect: { id: organizationId } },
          member: { connect: { id: props.member.id } },
          activityLogType: { connect: { id: activityLogType.id } },
          target_entity_type: "Employee",
          target_entity_id: employeeId,
          target_entity_name: props.body.email,
          details: "Employee invited with role",
          created_at: now,
        },
      });
    }
    return await HrmTimeTrackingInvitationTransformer.transform(
      invitationRecord,
    );
  }
  // ──────────────────────────────────────────────────────────────────────────
  // 6. BRANCH B — Invited email has NO existing member account
  //    → Create pending invitation via collector
  // ──────────────────────────────────────────────────────────────────────────
  // 6a. Prevent duplicate pending invitation for this email+org
  const pendingInvitation =
    await MyGlobal.prisma.hrm_time_tracking_invitations.findFirst({
      where: {
        email: props.body.email,
        hrm_time_tracking_organization_id: organizationId,
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (pendingInvitation !== null) {
    throw new HttpException("Invitation already pending", 409);
  }
  // 6b. Create pending invitation using the collector
  const invitationRecord =
    await MyGlobal.prisma.hrm_time_tracking_invitations.create({
      data: await HrmTimeTrackingInvitationCollector.collect({
        body: props.body,
        organization: { id: organizationId },
        member: { id: props.member.id },
      }),
      ...HrmTimeTrackingInvitationTransformer.select(),
    });
  return await HrmTimeTrackingInvitationTransformer.transform(invitationRecord);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberInvitations(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingInvitation.ICreate;
// }): Promise<IHrmTimeTrackingInvitation> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_invitations.create({
//     data: await HrmTimeTrackingInvitationCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmTimeTrackingInvitationTransformer.select(),
//   });
//   return await HrmTimeTrackingInvitationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------