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

export async function test_api_member_subscribed_communities_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Request the second page of subscribed communities with limit=10
  const request: IRedditCommunitySubscription.IRequest = {
    page: 2,
    limit: 10,
  } satisfies IRedditCommunitySubscription.IRequest;
  const response =
    await api.functional.redditCommunity.member.community.subscribed.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 2", response.pagination.current, 2);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.predicate("records >= 0", response.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", response.pagination.pages >= 0);
  // 4. Validate data array
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 5. Validate each subscription entry
  const foundCommunityIds = new Set<string>();
  for (const subscription of response.data) {
    // Validate community structure
    TestValidator.equals(
      "community has valid UUID",
      subscription.community.id.length,
      36,
    );
    TestValidator.predicate(
      "community has name",
      typeof subscription.community.name === "string" &&
        subscription.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has description",
      typeof subscription.community.description === "string" &&
        subscription.community.description.length >= 0,
    );
    TestValidator.predicate(
      "community has subscriber count",
      typeof subscription.community.subscriber_count === "number" &&
        subscription.community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "community has created_at",
      typeof subscription.community.created_at === "string" &&
        (subscription.community.created_at.match(
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/
        ) !== null),
    );
    TestValidator.predicate(
      "community has updated_at",
      typeof subscription.community.updated_at === "string" &&
        (subscription.community.updated_at.match(
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/
        ) !== null),
    );
    // Validate member structure
    TestValidator.equals(
      "member has valid UUID",
      subscription.member.id.length,
      36,
    );
    TestValidator.predicate(
      "member has username",
      typeof subscription.member.username === "string" &&
        subscription.member.username.length > 0,
    );
    TestValidator.predicate(
      "member has display_name",
      typeof subscription.member.display_name === "string" &&
        subscription.member.display_name.length >= 0,
    );
    TestValidator.predicate(
      "member has karma_score",
      typeof subscription.member.karma_score === "number" &&
        subscription.member.karma_score >= 0,
    );
    TestValidator.predicate(
      "member has created_at",
      typeof subscription.member.created_at === "string" &&
        (subscription.member.created_at.match(
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/
        ) !== null),
    );
    // Ensure no duplicate community IDs in this response
    TestValidator.predicate(
      "no duplicate community IDs",
      !foundCommunityIds.has(subscription.community.id),
    );
    foundCommunityIds.add(subscription.community.id);
  }
  // 6. Validate number of records returned
  TestValidator.predicate(
    "at most limit records returned",
    response.data.length <= 10,
  );
  TestValidator.predicate(
    "at least 0 records returned",
    response.data.length >= 0,
  );
}