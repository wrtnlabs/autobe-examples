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

export async function postCommunityPlatformAdministratorFeatureFlags(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformFeatureFlag.ICreate;
}): Promise<ICommunityPlatformFeatureFlag> {
  // Check for flag_key uniqueness
  const existing =
    await MyGlobal.prisma.community_platform_feature_flags.findUnique({
      where: { flag_key: props.body.flag_key },
    });
  if (existing) {
    throw new HttpException(
      "Feature flag with the given key already exists.",
      409,
    );
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_feature_flags.create(
    {
      data: {
        id: v4(),
        flag_key: props.body.flag_key,
        flag_type: props.body.flag_type,
        status: props.body.status,
        description: props.body.description ?? undefined,
        created_at: now,
        updated_at: now,
        deleted_at: undefined,
      },
    },
  );
  return {
    id: created.id,
    flag_key: created.flag_key,
    flag_type: created.flag_type,
    status: created.status,
    description: created.description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
