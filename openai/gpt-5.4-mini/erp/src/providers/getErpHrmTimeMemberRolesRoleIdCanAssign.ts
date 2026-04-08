import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberRolesRoleIdCanAssign(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeRole.ICanAssign> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          deleted_at: null,
          status: "active",
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      },
    );
  const role = await MyGlobal.prisma.erp_hrm_time_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      is_builtin: true,
      organization: {
        select: {
          id: true,
        },
      },
    },
  });
  return {
    canAssign:
      role.organization.id === membership.erp_hrm_time_organization_id &&
      role.is_builtin,
  };
}
