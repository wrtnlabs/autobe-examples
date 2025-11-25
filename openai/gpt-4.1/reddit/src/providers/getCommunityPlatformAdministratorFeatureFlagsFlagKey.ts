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

export async function getCommunityPlatformAdministratorFeatureFlagsFlagKey(props: {
  administrator: AdministratorPayload;
  flagKey: string;
}): Promise<ICommunityPlatformFeatureFlag> {
  const record =
    await MyGlobal.prisma.community_platform_feature_flags.findFirst({
      where: { flag_key: props.flagKey, deleted_at: null },
    });

  if (!record) {
    throw new HttpException("Feature flag not found", 404);
  }

  return {
    id: record.id,
    flag_key: record.flag_key,
    flag_type: record.flag_type,
    status: record.status,
    description: record.description === null ? null : record.description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
