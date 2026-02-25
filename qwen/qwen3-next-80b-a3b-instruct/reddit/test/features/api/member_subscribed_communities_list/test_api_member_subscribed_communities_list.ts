import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscribed_communities_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberCredentials });
  // 2. Call the endpoint to get subscribed communities list with default pagination (page=1, limit=20)
  const response =
    await api.functional.redditCommunity.member.community.subscribed.index(
      memberConnection,
      {
        body: {} as IRedditCommunitySubscription.IRequest, // Using default page=1, limit=20
      },
    );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals("pagination page", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "at least one community in response",
    response.data.length >= 0,
  );
  // 4. Validate each community's structure
  for (const subscription of response.data) {
    // Validate community summary
    TestValidator.equals(
      "community id is uuid",
      typeof subscription.community.id,
      "string",
    );
    TestValidator.predicate(
      "community name is string",
      typeof subscription.community.name === "string",
    );
    TestValidator.predicate(
      "community description is string",
      typeof subscription.community.description === "string",
    );
    TestValidator.predicate(
      "community icon_url is string or null",
      subscription.community.icon_url === null ||
        typeof subscription.community.icon_url === "string",
    );
    TestValidator.predicate(
      "community subscriber_count is non-negative integer",
      typeof subscription.community.subscriber_count === "number" &&
        subscription.community.subscriber_count >= 0,
    );
    // Validate member summary
    TestValidator.equals(
      "member id is uuid",
      typeof subscription.member.id,
      "string",
    );
    TestValidator.predicate(
      "member username is string",
      typeof subscription.member.username === "string",
    );
    TestValidator.predicate(
      "member display_name is string",
      typeof subscription.member.display_name === "string",
    );
    TestValidator.predicate(
      "member bio is string or null",
      subscription.member.bio === null ||
        typeof subscription.member.bio === "string",
    );
    TestValidator.predicate(
      "member avatar_url is string or null",
      subscription.member.avatar_url === null ||
        typeof subscription.member.avatar_url === "string",
    );
    TestValidator.predicate(
      "member karma_score is integer",
      typeof subscription.member.karma_score === "number" &&
        Number.isInteger(subscription.member.karma_score),
    );
    TestValidator.equals(
      "member created_at is ISO datetime",
      typeof subscription.member.created_at,
      "string",
    );
  }
}
