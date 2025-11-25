import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putCommunityPlatformAdministratorFeatureFlagsFlagKey(props: {
  administrator: AdministratorPayload;
  flagKey: string;
  body: ICommunityPlatformFeatureFlag.IUpdate;
}): Promise<ICommunityPlatformFeatureFlag> {
  const flag =
    await MyGlobal.prisma.community_platform_feature_flags.findUnique({
      where: { flag_key: props.flagKey },
    });
  if (!flag) {
    throw new HttpException("Feature flag not found", 404);
  }
  const updated = await MyGlobal.prisma.community_platform_feature_flags.update(
    {
      where: { flag_key: props.flagKey },
      data: {
        ...(props.body.flag_type !== undefined
          ? { flag_type: props.body.flag_type }
          : {}),
        ...(props.body.status !== undefined
          ? { status: props.body.status }
          : {}),
        ...(props.body.description !== undefined
          ? { description: props.body.description }
          : {}),
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );
  return {
    id: updated.id,
    flag_key: updated.flag_key,
    flag_type: updated.flag_type,
    status: updated.status,
    description:
      updated.description === undefined ? undefined : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: Object.prototype.hasOwnProperty.call(updated, "deleted_at")
      ? updated.deleted_at === null
        ? null
        : toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
