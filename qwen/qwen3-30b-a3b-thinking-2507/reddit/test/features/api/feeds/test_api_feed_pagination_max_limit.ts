import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditFeed";
import type { IRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeed";
import type { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_feed_pagination_max_limit(connection: api.IConnection): Promise<void> {
    // Authenticate as member for feed operations
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            username: RandomGenerator.name(),
        },
    });
    // Request feeds with limit=100
    const response = await api.functional.reddit.feeds.index(memberConnection, {
        body: {
            limit: 100,
        },
    });
    typia.assert(response);
    // Validate response
    TestValidator.equals("data length", response.data.length, 100);
    TestValidator.equals("pagination limit", response.pagination.limit, 100);
    TestValidator.equals("pagination records", response.pagination.records, 100);
    TestValidator.equals("pagination pages", response.pagination.pages, 1); }