import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscriptions_list_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member and authenticate
  const authConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: "http://localhost/test",
      referrer: "http://localhost/test",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // Create member connection using the token from authentication
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: member.token.access,
  };
  // Test 1: List all subscriptions (may be empty for new user)
  const allSubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {} satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(allSubscriptions);
  // Validate pagination structure
  TestValidator.equals(
    "pagination present",
    allSubscriptions.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "page current >= 1",
    allSubscriptions.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit > 0",
    allSubscriptions.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "records non-negative",
    allSubscriptions.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages >= 0",
    allSubscriptions.pagination.pages >= 0,
    true,
  );
  // Validate data array
  TestValidator.equals(
    "data is array",
    Array.isArray(allSubscriptions.data),
    true,
  );
  TestValidator.equals(
    "data length matches records",
    allSubscriptions.data.length,
    allSubscriptions.pagination.records,
  );
  // Test 2: List with default pagination parameters
  const paginatedSubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedSubscriptions);
  TestValidator.equals(
    "page number 1",
    paginatedSubscriptions.pagination.current,
    1,
  );
  TestValidator.equals("limit 20", paginatedSubscriptions.pagination.limit, 20);
  // Test 3: List with different page and limit
  const moreSubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(moreSubscriptions);
  TestValidator.equals(
    "page number 1",
    moreSubscriptions.pagination.current,
    1,
  );
  TestValidator.equals("limit 5", moreSubscriptions.pagination.limit, 5);
  // Validate response structure for non-empty data
  if (allSubscriptions.data.length > 0) {
    const firstSubscription = allSubscriptions.data[0];
    TestValidator.predicate(
      "subscription has id",
      typeof firstSubscription.id === "string",
    );
    TestValidator.predicate(
      "subscription has service name",
      typeof firstSubscription.serviceName === "string",
    );
    TestValidator.predicate(
      "subscription has state",
      ["open", "half-open", "closed"].includes(firstSubscription.state),
    );
  }
}
