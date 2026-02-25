import { ICommunityPlatformPostFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostFavorite";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_post_favorite(
  input?: DeepPartial<ICommunityPlatformPostFavorite.ICreate>,
): ICommunityPlatformPostFavorite.ICreate {
  return {
    id: input?.id ?? typia.random<string & tags.Format<"uuid">>(),
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    post_id: input?.post_id ?? typia.random<string & tags.Format<"uuid">>(),
    created_at: input?.created_at ?? new Date().toISOString(),
    updated_at: input?.updated_at ?? new Date().toISOString(),
  };
}
