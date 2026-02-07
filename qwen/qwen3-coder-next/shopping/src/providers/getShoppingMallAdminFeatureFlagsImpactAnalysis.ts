import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicFeatureFlag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminFeatureFlagsImpactAnalysis(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallSystematicFeatureFlag> {
  const featureFlags =
    await MyGlobal.prisma.shopping_mall_systematic_feature_flags.findMany();
  return featureFlags.map((flag) => ({
    id: flag.id,
    feature_name: flag.feature_name,
    description: flag.description,
    is_enabled: flag.is_enabled,
    target_actor: flag.target_actor,
    rollout_percentage: flag.rollout_percentage,
    expires_at: flag.expires_at ? toISOStringSafe(flag.expires_at) : null,
  }));
}
