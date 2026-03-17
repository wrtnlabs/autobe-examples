import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_home_feed_empty_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Access the home feed without creating any subscriptions
  const homeFeed = await api.functional.redditPlatform.member.feeds.home.index(
    memberConnection,
    {
      body: {} satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(homeFeed);
  // 3. Verify that the response data array is empty
  TestValidator.equals("data array is empty", homeFeed.data.length, 0);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", homeFeed.pagination.current, 1);
  TestValidator.predicate("limit is positive", homeFeed.pagination.limit > 0);
  TestValidator.equals("records count is 0", homeFeed.pagination.records, 0);
  TestValidator.equals("pages count is 0", homeFeed.pagination.pages, 0);
  // 5. Verify response structure matches IPageIRedditPlatformPost.ISummary
  TestValidator.predicate(
    "response has pagination",
    homeFeed.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(homeFeed.data),
  );
}