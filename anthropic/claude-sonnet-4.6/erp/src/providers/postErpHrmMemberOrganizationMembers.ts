import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmOrganizationMemberCollector } from "../collectors/ErpHrmOrganizationMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationMemberTransformer } from "../transformers/ErpHrmOrganizationMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizationMembers(props: {
  member: MemberPayload;
  body: IErpHrmOrganizationMember.ICreate;
}): Promise<IErpHrmOrganizationMember> {
  // Step 1: Resolve the requester's organization context and verify employee:manage permission
  const requesterMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        deleted_at: null,
        status: "active",
      },
      select: {
        id: true,
        organization_id: true,
        role: {
          select: {
            permissions: {
              select: {
                permission_code: true,
              },
            },
          },
        },
      },
    });
  if (!requesterMember) {
    throw new HttpException("No active organization membership found", 403);
  }
  const hasPermission = requesterMember.role.permissions.some(
    (p) => p.permission_code === "employee:manage",
  );
  if (!hasPermission) {
    throw new HttpException(
      "Forbidden: employee:manage permission required",
      403,
    );
  }
  const organizationId = requesterMember.organization_id;
  // Step 2: Validate memberId references an existing, non-deleted member
  const targetMember = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: {
      id: props.body.memberId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!targetMember) {
    throw new HttpException(
      "The specified memberId does not reference an existing or active platform user",
      400,
    );
  }
  // Step 3: Validate roleId belongs to the same organization
  const targetRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      id: props.body.roleId,
      erp_hrm_organization_id: organizationId,
    },
    select: { id: true },
  });
  if (!targetRole) {
    throw new HttpException(
      "The specified roleId does not belong to this organization",
      400,
    );
  }
  // Step 4: Validate departmentId (if provided) belongs to the same organization and is not deleted
  if (props.body.departmentId) {
    const targetDepartment =
      await MyGlobal.prisma.erp_hrm_departments.findFirst({
        where: {
          id: props.body.departmentId,
          organization_id: organizationId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!targetDepartment) {
      throw new HttpException(
        "The specified departmentId does not belong to this organization or has been deleted",
        400,
      );
    }
  }
  // Step 5: Check unique constraint - reject 409 if already a member
  const existingMembership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: organizationId,
        member_id: props.body.memberId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingMembership) {
    throw new HttpException(
      "This user is already a member of the organization",
      409,
    );
  }
  // Step 6: Create the organization member record using collector + transformer
  const created = await MyGlobal.prisma.erp_hrm_organization_members.create({
    data: await ErpHrmOrganizationMemberCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: organizationId },
      erpHrmMembers: { id: props.member.id },
      erpHrmMemberSessions: { id: props.member.session_id },
    }),
    ...ErpHrmOrganizationMemberTransformer.select(),
  });
  // Step 7: Emit activity log entry recording the member addition event
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      action_type: "employee_invited",
      target_entity_type: "member",
      target_entity_id: created.id,
      details: null,
      created_at: new Date(),
      organization: { connect: { id: organizationId } },
      performer: { connect: { id: requesterMember.id } },
    },
  });
  // Step 8: Return the fully populated OrganizationMember record
  return await ErpHrmOrganizationMemberTransformer.transform(created);
}
