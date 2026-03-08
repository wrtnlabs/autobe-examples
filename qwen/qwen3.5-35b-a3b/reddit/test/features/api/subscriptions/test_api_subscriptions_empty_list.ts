import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscriptions_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with no existing subscriptions
  const registerConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(registerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a connection with the registered member's token for API calls
  const subscriptionsConnection: api.IConnection = { host: connection.host };
  subscriptionsConnection.headers = {
    Authorization: member.token.access,
  };
  // 3. Test default pagination (limit=20)
  const defaultResponse: IPageIRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.member.subscriptions.index(
      subscriptionsConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Verify default pagination metadata
  TestValidator.equals(
    "default pagination current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default pagination records count",
    defaultResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "default pagination total pages",
    defaultResponse.pagination.pages,
    0,
  );
  // Verify empty data array
  TestValidator.equals(
    "default subscriptions data is empty",
    defaultResponse.data.length,
    0,
  );
  // 4. Test with limit=5
  const limit5Response: IPageIRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.member.subscriptions.index(
      subscriptionsConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(limit5Response);
  TestValidator.equals(
    "limit=5 pagination records count",
    limit5Response.pagination.records,
    0,
  );
  TestValidator.equals(
    "limit=5 pagination pages count",
    limit5Response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "limit=5 subscriptions data is empty",
    limit5Response.data.length,
    0,
  );
  // 5. Test with limit=100
  const limit100Response: IPageIRedditPlatformCommunitySubscription.ISummary =
    await api.functional.redditPlatform.member.subscriptions.index(
      subscriptionsConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(limit100Response);
  TestValidator.equals(
    "limit=100 pagination records count",
    limit100Response.pagination.records,
    0,
  );
  TestValidator.equals(
    "limit=100 pagination pages count",
    limit100Response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "limit=100 subscriptions data is empty",
    limit100Response.data.length,
    0,
  );
}
