import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRolePermission";
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

export async function getErpHrmTimeMemberRolesRoleIdCanDelete(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeRolePermission> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          deleted_at: null,
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
    },
    select: {
      is_builtin: true,
    },
  });
  if (role.is_builtin) {
    return {
      canDelete: false,
      reason: false,
    };
  }
  const employee = await MyGlobal.prisma.erp_hrm_time_employees.findFirst({
    where: {
      erp_hrm_time_role_id: props.roleId,
      erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
    },
    select: {
      id: true,
    },
  });
  if (employee !== null) {
    return {
      canDelete: false,
      reason: false,
    };
  }
  return {
    canDelete: true,
    reason: null,
  };
}
