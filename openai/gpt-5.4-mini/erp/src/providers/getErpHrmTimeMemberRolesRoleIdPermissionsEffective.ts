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
import { ErpHrmTimeRoleAtEffectivePermissionTransformer } from "../transformers/ErpHrmTimeRoleAtEffectivePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberRolesRoleIdPermissionsEffective(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeRole.IEffectivePermission> {
  const role = await MyGlobal.prisma.erp_hrm_time_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      erp_hrm_time_organization_id: true,
      rolePermissions: {
        where: {
          deleted_at: null,
          permission: {
            deleted_at: null,
          },
        },
        orderBy: {
          permission: {
            key: "asc",
          },
        },
        select: {
          permission: {
            select: {
              key: true,
              description: true,
            },
          },
        },
      },
    },
  });
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          deleted_at: null,
          erp_hrm_time_organization_id: role.erp_hrm_time_organization_id,
          organization: {
            deleted_at: null,
          },
        },
        select: {
          id: true,
        },
      },
    );
  void membership;
  return ErpHrmTimeRoleAtEffectivePermissionTransformer.transform(
    role.rolePermissions[0].permission,
  );
}
