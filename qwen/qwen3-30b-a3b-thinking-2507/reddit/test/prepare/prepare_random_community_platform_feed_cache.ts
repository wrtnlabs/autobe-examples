import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeedCache";
export function prepare_random_community_platform_feed_cache(input?: DeepPartial<ICommunityPlatformFeedCache.ICreate> | undefined): ICommunityPlatformFeedCache.ICreate {
    return {
        feed_type: input?.feed_type ?? typia.random<"home" | "popular" | "community">(),
        feed_data: typia.random<string>(),
    };
}