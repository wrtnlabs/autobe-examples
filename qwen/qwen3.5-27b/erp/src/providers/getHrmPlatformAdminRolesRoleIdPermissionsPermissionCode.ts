import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformRolePermissionTransformer } from "../transformers/HrmPlatformRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformAdminRolesRoleIdPermissionsPermissionCode(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  permissionCode: string;
}): Promise<IHrmPlatformRolePermission> {
  const permission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findUniqueOrThrow({
      where: {
        hrm_platform_role_id_permission_code: {
          hrm_platform_role_id: props.roleId,
          permission_code: props.permissionCode,
        },
        deleted_at: null,
      },
      ...HrmPlatformRolePermissionTransformer.select(),
    });
  return await HrmPlatformRolePermissionTransformer.transform(permission);
}
