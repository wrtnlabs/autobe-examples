import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostAnalytic";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_community_posts_analytics_top_post(connection: api.IConnection) {
    const email = typia.random<string & tags.Format<"email">>();
    const username = RandomGenerator.name(1);
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: {
            email,
            username,
        },
    });
    const analytics = await api.functional.community.member.analytics.posts.index(connection);
    typia.assert(analytics);
    TestValidator.predicate("topPosts should contain at least one item", analytics.topPosts.length >= 1);
}