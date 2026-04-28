import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunitySnapshot";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySnapshot";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_community_snapshots_filter_by_community(connection: api.IConnection): Promise<void> {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.name(1),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    const community: IREdditLikeCommunityCommunity = await generate_random_reddit_like_community_member_communities_create(memberConnection, {
        body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies DeepPartial<IREdditLikeCommunityCommunity.ICreate>,
    });
    const request: IRedditLikeCommunityCommunitySnapshot.IRequest = {
        community_id: community.id,
        page: 1,
        limit: 10,
    };
    const response: IPageIRedditLikeCommunityCommunitySnapshot.ISummary = await api.functional.redditLikeCommunity.community_snapshots.index(memberConnection, {
        body: request,
    });
    typia.assert(response);
    TestValidator.predicate("snapshots are returned", response.data.length > 0);
    response.data.forEach((snapshot) => {
        TestValidator.equals("snapshot references correct community_id", snapshot.community_id, community.id);
    });
    TestValidator.equals("pagination current page", response.pagination.current, request.page);
    TestValidator.equals("pagination limit", response.pagination.limit, request.limit);
}