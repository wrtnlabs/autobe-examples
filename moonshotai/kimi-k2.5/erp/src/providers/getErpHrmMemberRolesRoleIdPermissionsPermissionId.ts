import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { ErpHrmRolePermissionTransformer } from "../transformers/ErpHrmRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberRolesRoleIdPermissionsPermissionId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  permissionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmRolePermission> {
  const permission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirstOrThrow({
      where: {
        id: props.permissionId,
        role_id: props.roleId,
        deleted_at: null,
      },
      ...ErpHrmRolePermissionTransformer.select(),
    });
  return ErpHrmRolePermissionTransformer.transform(permission);
}
