import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackRolePermissionTransformer } from "../transformers/HrmTimeTrackRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberRolesRoleIdPermissionsPermissionId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  permissionId: string;
}): Promise<IHrmTimeTrackRolePermission> {
  const record =
    await MyGlobal.prisma.hrm_time_track_role_permissions.findFirstOrThrow({
      ...HrmTimeTrackRolePermissionTransformer.select(),
      where: {
        hrm_time_track_role_id: props.roleId,
        permission: props.permissionId,
      },
    });
  return await HrmTimeTrackRolePermissionTransformer.transform(record);
}
