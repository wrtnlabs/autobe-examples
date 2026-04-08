import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscribe_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create new connection with member's token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = { ...memberConnection.headers };
  // 2. Subscribe to a community with unique name
  const communityName =
    RandomGenerator.alphaNumeric(10) + "_" + RandomGenerator.alphaNumeric(4);
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      authenticatedConnection,
      {
        communityName,
      },
    );
  typia.assert(subscription);
  // 3. Validate subscription is active (deleted_at is NULL)
  TestValidator.equals("subscription is active", subscription.deleted_at, null);
  // 4. Validate user relationship
  TestValidator.equals(
    "user id matches authenticated member",
    subscription.user.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "user username matches",
    subscription.user.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "user karma is present",
    subscription.user.karma >= 0,
    true,
  );
  // 5. Validate community relationship
  TestValidator.equals(
    "community name matches input",
    subscription.community.name,
    communityName,
  );
  TestValidator.equals(
    "community has subscriber_count",
    subscription.community.subscriber_count >= 0,
    true,
  );
  TestValidator.equals(
    "community owner is present",
    subscription.community.owner.id !== undefined,
    true,
  );
  TestValidator.equals(
    "community owner username is present",
    subscription.community.owner.username.length >= 3,
    true,
  );
  // 6. Validate timestamps are properly set
  TestValidator.predicate(
    "subscribed_at is valid timestamp",
    subscription.subscribed_at !== undefined &&
      subscription.subscribed_at !== null,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    subscription.created_at !== undefined && subscription.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    subscription.updated_at !== undefined && subscription.updated_at !== null,
  );
  // 7. Validate community timestamps
  TestValidator.predicate(
    "community created_at is valid",
    subscription.community.created_at !== undefined &&
      subscription.community.created_at !== null,
  );
  TestValidator.predicate(
    "community updated_at is valid",
    subscription.community.updated_at !== undefined &&
      subscription.community.updated_at !== null,
  );
  // 8. Validate community soft-delete status
  TestValidator.equals(
    "community is active",
    subscription.community.deleted_at,
    null,
  );
  // Note: owner.deleted_at is not available on ISummary type
}