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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationMemberTransformer } from "../transformers/ErpHrmOrganizationMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizationMembersOrganizationMemberIdDeactivate(props: {
  member: MemberPayload;
  organizationMemberId: string & tags.Format<"uuid">;
}): Promise<IErpHrmOrganizationMember> {
  // Step 1: Find the target organization member to derive organization context
  const target =
    await MyGlobal.prisma.erp_hrm_organization_members.findUniqueOrThrow({
      where: { id: props.organizationMemberId },
      select: {
        id: true,
        organization_id: true,
        status: true,
        role_id: true,
      },
    });
  // Step 2: Find the requesting actor's org member record in the same organization
  const requester =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: target.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
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
  if (requester === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify the requester holds the 'employee:manage' permission
  const hasPermission = requester.role.permissions.some(
    (p) => p.permission_code === "employee:manage",
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Guard against double deactivation
  if (target.status === "deactivated") {
    throw new HttpException("Member is already deactivated", 409);
  }
  // Step 5: Owner guard — prevent deactivating the sole owner
  const ownerRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      erp_hrm_organization_id: target.organization_id,
      name: "Owner",
      is_builtin: true,
    },
    select: { id: true },
  });
  if (ownerRole !== null && target.role_id === ownerRole.id) {
    const activeOwnerCount =
      await MyGlobal.prisma.erp_hrm_organization_members.count({
        where: {
          organization_id: target.organization_id,
          role_id: ownerRole.id,
          status: "active",
          deleted_at: null,
        },
      });
    if (activeOwnerCount <= 1) {
      throw new HttpException(
        "Cannot deactivate the sole owner. Transfer ownership first.",
        422,
      );
    }
  }
  // Step 6: Update the target member's status to 'deactivated'
  await MyGlobal.prisma.erp_hrm_organization_members.update({
    where: { id: props.organizationMemberId },
    data: {
      status: "deactivated",
      updated_at: new Date(),
    },
  });
  // Step 7: Hard-delete any active timer (erp_hrm_timers has no deleted_at)
  await MyGlobal.prisma.erp_hrm_timers.deleteMany({
    where: { organization_member_id: props.organizationMemberId },
  });
  // Step 8: Write the activity log entry for this deactivation event
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      organization: { connect: { id: target.organization_id } },
      performer: { connect: { id: requester.id } },
      action_type: "employee_deactivated",
      target_entity_type: "member",
      target_entity_id: props.organizationMemberId,
      created_at: new Date(),
    },
  });
  // Step 9: Fetch and return the fully updated member record
  const updated =
    await MyGlobal.prisma.erp_hrm_organization_members.findUniqueOrThrow({
      where: { id: props.organizationMemberId },
      ...ErpHrmOrganizationMemberTransformer.select(),
    });
  return await ErpHrmOrganizationMemberTransformer.transform(updated);
}
