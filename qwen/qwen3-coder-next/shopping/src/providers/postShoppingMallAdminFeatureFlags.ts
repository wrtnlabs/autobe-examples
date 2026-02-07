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

export async function postShoppingMallAdminFeatureFlags(props: {
  admin: AdminPayload;
  body: IShoppingMallSystematicFeatureFlag.ICreate;
}): Promise<IShoppingMallSystematicFeatureFlag> {
  const created =
    await MyGlobal.prisma.shopping_mall_systematic_feature_flags.create({
      data: {
        id: v4(),
        feature_name: "",
        description: "",
        is_enabled: false,
        target_actor: "all",
        rollout_percentage: 0,
        expires_at: null,
      },
    });
  return {
    id: created.id,
    feature_name: created.feature_name,
    description: created.description,
    is_enabled: created.is_enabled,
    target_actor: created.target_actor,
    rollout_percentage: created.rollout_percentage,
    expires_at: created.expires_at === null ? undefined : created.expires_at,
  };
}
