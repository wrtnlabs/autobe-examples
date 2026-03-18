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

export async function postErpHrmMemberOrganizationMembersOrganizationMemberIdReactivate(props: {
  member: MemberPayload;
  organizationMemberId: string & tags.Format<"uuid">;
}): Promise<IErpHrmOrganizationMember> {
  // Step 1: Load the target organization member (must exist and not be deleted)
  const targetMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        id: props.organizationMemberId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        status: true,
      },
    });
  // Step 2: Find the acting member's record within the same organization
  const actingMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        organization_id: targetMember.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role_id: true,
      },
    });
  // Step 3: Permission check - verify employee:manage permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      role_id: actingMember.role_id,
      permission_code: "employee:manage",
    },
    select: { id: true },
  });
  if (!permission) {
    throw new HttpException(
      "Forbidden: missing employee:manage permission",
      403,
    );
  }
  // Step 4: Status check - target must be deactivated (not already active)
  if (targetMember.status === "active") {
    throw new HttpException("Bad Request: member is already active", 400);
  }
  // Step 5: Update status to active
  await MyGlobal.prisma.erp_hrm_organization_members.update({
    where: { id: props.organizationMemberId },
    data: {
      status: "active",
      updated_at: new Date(),
    },
  });
  // Step 6: Create activity log entry for reactivation event
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      organization_id: actingMember.organization_id,
      organization_member_id: actingMember.id,
      action_type: "employee_reactivated",
      target_entity_type: "member",
      target_entity_id: props.organizationMemberId,
      details: null,
      created_at: new Date(),
    },
  });
  // Step 7: Re-fetch and return full updated record via transformer
  const updated =
    await MyGlobal.prisma.erp_hrm_organization_members.findUniqueOrThrow({
      where: { id: props.organizationMemberId },
      ...ErpHrmOrganizationMemberTransformer.select(),
    });
  return ErpHrmOrganizationMemberTransformer.transform(updated);
}
