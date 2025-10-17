import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumFeatureFlag";

export async function getEconPoliticalForumFeatureFlagsFeatureFlagId(props: {
  featureFlagId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumFeatureFlag> {
  const { featureFlagId } = props;

  const record =
    await MyGlobal.prisma.econ_political_forum_feature_flags.findUnique({
      where: { id: featureFlagId },
    });

  if (!record || record.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  const result = {
    id: record.id as string & tags.Format<"uuid">,
    key: record.key,
    enabled: record.enabled,
    rollout_percentage:
      record.rollout_percentage === null ? null : record.rollout_percentage,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  } satisfies IEconPoliticalForumFeatureFlag;

  return result;
}
