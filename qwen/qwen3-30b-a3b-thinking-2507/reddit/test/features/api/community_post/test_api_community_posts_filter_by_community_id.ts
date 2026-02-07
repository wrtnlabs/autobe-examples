import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
export async function test_api_community_posts_filter_by_community_id(connection: api.IConnection): Promise<void> {
    const communityId = typia.random<string & tags.Format<"uuid">>();
    const result = await api.functional.communityPlatform.posts.index(connection, {
        body: {
            community_id: communityId,
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>,
        }
    });
    typia.assert(result);
    TestValidator.predicate("should have posts", result.data.length > 0);
    TestValidator.predicate("all posts should belong to community", result.data.every(post => post.community.id === communityId));
}