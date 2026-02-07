import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_home_feed_with_multiple_subscriptions(connection: api.IConnection): Promise<void> {
    // Create a new member account
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {
            id: "test-member",
            name: "Test Member",
            email: "test@example.com",
            password: "password123",
        },
    });

    // Get home feed
    const homeFeed = await api.functional.communityPlatform.member.feeds.at(memberConnection);

    // Verify the feed returns content
    TestValidator.predicate("Home feed should have posts", homeFeed.data.length > 0);

    // Verify posts are in "hot" order (most recent first)
    TestValidator.predicate("Home feed should display posts in hot order", homeFeed.data.every((post, index, array) => index === array.length - 1 ||
        new Date(array[index].created_at).valueOf() >=
            new Date(array[index + 1].created_at).valueOf()));
}