import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPostText";
import type { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import type { IRedditPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostVote";
import { prepare_random_reddit_community } from "../../../prepare/prepare_random_reddit_community";
import { prepare_random_reddit_post_text } from "../../../prepare/prepare_random_reddit_post_text";
import { generate_random_reddit_member_communities_create } from "../../../generate/generate_random_reddit_member_communities_create";
import { generate_random_reddit_member_communities_posts_create } from "../../../generate/generate_random_reddit_member_communities_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_community_posts_week_time_filter(connection: api.IConnection): Promise<void> {
    /* 1. Authorize member */
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.name(),
        },
    });

    /* 2. Create community */
    const community = await generate_random_reddit_member_communities_create(memberConnection, {
        body: {
            name: RandomGenerator.name().toLowerCase().replace(/\s+/g, "_"),
            description: RandomGenerator.paragraph({ sentences: 1 }),
        },
    });

    /* 3. Create 15 posts spanning 15 days */
    const posts: IRedditPostText[] = [];
    for (let i = 0; i < 15; i++) {
        const post = await generate_random_reddit_member_communities_posts_create(memberConnection, {
            params: { communityId: community.id },
        });
        posts.push(post);
    }

    /* 4. Retrieve posts with timeFilter 'week' */
    const postsResponse = await api.functional.reddit.member.communities.posts.index(memberConnection, {
        communityId: community.id,
        body: {
            timeFilter: "week",
        },
    });
    typia.assert(postsResponse);
    TestValidator.equals("Should have 7 posts for week timeFilter", postsResponse.data.length, 7);
}