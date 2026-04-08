import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_member_subscriptions_dashboard(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Call dashboard endpoint - returns single ISummary object
  const subscriptionSummary =
    await api.functional.redditCommunity.member.subscriptions.dashboard(
      memberConnection,
    );
  typia.assert(subscriptionSummary);
  // Validate status is either active or terminated
  TestValidator.predicate(
    "subscription status is valid",
    subscriptionSummary.status === "active" ||
      subscriptionSummary.status === "terminated",
  );
  // Validate community exists and has required fields
  typia.assert(subscriptionSummary.community);
  TestValidator.predicate(
    "community has name",
    typeof subscriptionSummary.community.name === "string",
  );
  TestValidator.predicate(
    "community has subscriber_count or undefined",
    subscriptionSummary.community.subscriber_count === undefined ||
      typeof subscriptionSummary.community.subscriber_count === "number",
  );
  // Validate timestamps are valid ISO 8601
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(subscriptionSummary.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(subscriptionSummary.updated_at)),
  );
  // Validate deleted_at is null or valid date-time
  if (subscriptionSummary.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is valid date-time",
      !isNaN(Date.parse(subscriptionSummary.deleted_at)),
    );
  }
  // Validate business logic: active subscriptions should have null deleted_at
  if (subscriptionSummary.status === "active") {
    TestValidator.equals(
      "active subscription has null deleted_at",
      subscriptionSummary.deleted_at,
      null,
    );
  }
}
