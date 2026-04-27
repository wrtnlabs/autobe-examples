import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingOrganizationTransformer } from "../transformers/HrmTimeTrackingOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberOrganizationsOrganizationIdTransferOwnership(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingOrganization.ITransferOwnership;
}): Promise<IHrmTimeTrackingOrganization> {
  // 1. Find the organization - ensure it exists
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
      where: {
        id: props.organizationId,
        status: "active",
      },
      select: {
        id: true,
        hrm_time_tracking_member_id: true,
      },
    });
  // 2. Verify the requesting member is the current owner
  if (organization.hrm_time_tracking_member_id !== props.member.id) {
    throw new HttpException(
      "Only the current organization owner can transfer ownership",
      403,
    );
  }
  // 3. Look up target employee by UUID within this organization
  const targetEmployee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        id: props.body.employee_id,
        hrm_time_tracking_organization_id: props.organizationId,
      },
      select: {
        id: true,
        hrm_time_tracking_member_id: true,
        hrm_time_tracking_role_id: true,
        status: true,
        deleted_at: true,
      },
    });
  // 4. Verify target employee is active
  if (
    targetEmployee.status !== "active" ||
    targetEmployee.deleted_at !== null
  ) {
    throw new HttpException(
      "Target employee is deactivated and cannot receive ownership",
      409,
    );
  }
  // 5. Handle self-transfer (target is already the owner) - idempotent
  if (targetEmployee.hrm_time_tracking_member_id === props.member.id) {
    const org =
      await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
        where: { id: props.organizationId },
        ...HrmTimeTrackingOrganizationTransformer.select(),
      });
    return await HrmTimeTrackingOrganizationTransformer.transform(org);
  }
  // 6. Perform ownership transfer in a transaction
  const updatedOrganization = await MyGlobal.prisma.$transaction(async (tx) => {
    // Find the Owner built-in role for this organization
    const ownerRole = await tx.hrm_time_tracking_roles.findFirstOrThrow({
      where: {
        hrm_time_tracking_organization_id: props.organizationId,
        name: "Owner",
        type: "built_in",
        deleted_at: null,
      },
      select: { id: true },
    });
    // Find the Manager built-in role for this organization
    const managerRole = await tx.hrm_time_tracking_roles.findFirstOrThrow({
      where: {
        hrm_time_tracking_organization_id: props.organizationId,
        name: "Manager",
        type: "built_in",
        deleted_at: null,
      },
      select: { id: true },
    });
    // Find the current owner's employee record
    const currentOwnerEmployee =
      await tx.hrm_time_tracking_employees.findFirstOrThrow({
        where: {
          hrm_time_tracking_organization_id: props.organizationId,
          hrm_time_tracking_member_id: props.member.id,
          deleted_at: null,
        },
        select: { id: true },
      });
    // Update the target employee's role to Owner
    await tx.hrm_time_tracking_employees.update({
      where: { id: targetEmployee.id },
      data: {
        hrm_time_tracking_role_id: ownerRole.id,
        updated_at: new Date(),
      },
    });
    // Update the current owner's employee role to Manager
    await tx.hrm_time_tracking_employees.update({
      where: { id: currentOwnerEmployee.id },
      data: {
        hrm_time_tracking_role_id: managerRole.id,
        updated_at: new Date(),
      },
    });
    // Update the organization's owner to the target employee's member
    await tx.hrm_time_tracking_organizations.update({
      where: { id: props.organizationId },
      data: {
        hrm_time_tracking_member_id: targetEmployee.hrm_time_tracking_member_id,
        updated_at: new Date(),
      },
    });
    // Find/create activity log type for ownership transfer
    const activityLogType =
      await tx.hrm_time_tracking_activity_log_types.findFirstOrThrow({
        where: { code: "organization.ownership_transferred" },
        select: { id: true },
      });
    // Create activity log entry
    await tx.hrm_time_tracking_activity_logs.create({
      data: {
        id: v4(),
        hrm_time_tracking_organization_id: props.organizationId,
        hrm_time_tracking_member_id: props.member.id,
        hrm_time_tracking_activity_log_type_id: activityLogType.id,
        target_entity_type: "Organization",
        target_entity_id: props.organizationId,
        target_entity_name: "",
        details: `Ownership transferred from member ${props.member.id} to employee ${targetEmployee.id}`,
        created_at: new Date(),
      },
    });
    // Re-fetch and return the updated organization
    const org = await tx.hrm_time_tracking_organizations.findFirstOrThrow({
      where: { id: props.organizationId },
      ...HrmTimeTrackingOrganizationTransformer.select(),
    });
    return org;
  });
  return await HrmTimeTrackingOrganizationTransformer.transform(
    updatedOrganization,
  );
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
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmTimeTrackingMemberOrganizationsOrganizationIdTransferOwnership(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmTimeTrackingOrganization.ITransferOwnership;
// }): Promise<IHrmTimeTrackingOrganization> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
//     ...HrmTimeTrackingOrganizationTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingOrganizationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------