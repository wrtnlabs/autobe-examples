import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorFeatureFlagsFlagKey(props: {
  administrator: AdministratorPayload;
  flagKey: string;
}): Promise<ICommunityPlatformFeatureFlag> {
  const flag =
    await MyGlobal.prisma.community_platform_feature_flags.findUnique({
      where: { flag_key: props.flagKey },
    });
  if (!flag || flag.deleted_at !== null) {
    throw new HttpException("Feature flag not found", 404);
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_feature_flags.update(
    {
      where: { flag_key: props.flagKey },
      data: { deleted_at: now },
    },
  );
  return {
    id: updated.id,
    flag_key: updated.flag_key,
    flag_type: updated.flag_type,
    status: updated.status,
    description: updated.description ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
