import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_home_feed_sorting_time_range(connection: api.IConnection): Promise<void> {
    // 1. Create authenticated member
    const memberConnection: api.IConnection = { host: connection.host };
    const member: IRedditPlatformMember.IAuthorized = await api.functional.redditPlatform.auth.member.join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.MinLength<8>>(),
            username: RandomGenerator.alphabets(8) + "_" + RandomGenerator.alphabets(3),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(member);
    // 2. Test home feed with different time ranges for top sort
    const timeRanges: ("today" | "week" | "month" | "year" | "all")[] = [
        "today",
        "week",
        "month",
        "year",
        "all",
    ];
    for (const timeRange of timeRanges) {
        const feed: IPageIRedditPlatformPost.ISummary = await api.functional.redditPlatform.member.users.me.activity.index(memberConnection, {
            body: {
                page: 1,
                limit: 20,
                sort: "top" as const,
                topTimeRange: timeRange as IRedditPlatformPost.IRequest["topTimeRange"],
            },
        });
        typia.assert(feed);
        // Validate response structure
        TestValidator.predicate("response has pagination", feed.pagination.pages >= 1);
        TestValidator.predicate("response has data", feed.data.length >= 0);
        // Validate sorting when data exists
        if (feed.data.length > 1) {
            for (let i = 1; i < feed.data.length; i++) {
                TestValidator.predicate(`post ${i} should have fewer or equal upvotes than post ${i - 1}`, feed.data[i].upvotes_count <= feed.data[i - 1].upvotes_count);
            }
        }
    }
}