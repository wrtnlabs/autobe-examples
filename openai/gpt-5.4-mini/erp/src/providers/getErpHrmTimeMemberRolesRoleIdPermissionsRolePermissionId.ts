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

export async function getErpHrmTimeMemberRolesRoleIdPermissionsRolePermissionId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  rolePermissionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeRolePermission> {
  await MyGlobal.prisma.erp_hrm_time_role_permissions.findFirstOrThrow({
    where: {
      id: props.rolePermissionId,
      erp_hrm_time_role_id: props.roleId,
      deleted_at: null,
      role: {
        deleted_at: null,
      },
    },
    select: {
      id: true,
    },
  });
  return {
    canDelete: false,
    reason: null,
  };
}
