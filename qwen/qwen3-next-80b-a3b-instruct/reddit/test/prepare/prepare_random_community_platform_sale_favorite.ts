import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleFavorite";
export function prepare_random_community_platform_sale_favorite(
  input?: DeepPartial<ICommunityPlatformSaleFavorite.ICreate>,
): ICommunityPlatformSaleFavorite.ICreate {
  return {
    productId: input?.productId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
