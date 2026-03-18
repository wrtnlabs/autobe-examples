import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformPermissionTransformer } from "../transformers/HrmPlatformPermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberPermissionsPermissionId(props: {
  member: MemberPayload;
  permissionId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformPermission> {
  const permission =
    await MyGlobal.prisma.hrm_platform_permissions.findUniqueOrThrow({
      where: { id: props.permissionId },
      ...HrmPlatformPermissionTransformer.select(),
    });
  return await HrmPlatformPermissionTransformer.transform(permission);
}
