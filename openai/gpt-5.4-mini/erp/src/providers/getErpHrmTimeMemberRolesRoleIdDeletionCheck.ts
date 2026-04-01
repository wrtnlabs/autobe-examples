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

export async function getErpHrmTimeMemberRolesRoleIdDeletionCheck(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeRole.IDeletionCheck> {
  const role = await MyGlobal.prisma.erp_hrm_time_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
      is_builtin: true,
      erp_hrm_time_organization_id: true,
    },
  });
  const assignedEmployees = await MyGlobal.prisma.erp_hrm_time_employees.count({
    where: {
      erp_hrm_time_organization_id: role.erp_hrm_time_organization_id,
      erp_hrm_time_role_id: role.id,
      deleted_at: null,
    },
  });
  const reasons: string[] = [];
  if (role.is_builtin) reasons.push("Built-in roles cannot be deleted.");
  if (assignedEmployees > 0)
    reasons.push(
      `This role is assigned to ${assignedEmployees} employee${assignedEmployees === 1 ? "" : "s"}.`,
    );
  return {
    deletable: reasons.length === 0,
    reasons,
  };
}
