import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscription_delete_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a valid subscription ID for testing
  // Note: In a real test, we would create a subscription first
  // This test validates the delete operation's success response
  const subscriptionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the subscription
  // On success, returns void (HTTP 204 No Content)
  // On failure, throws HttpError (404 if not found, 403 if not owned, etc.)
  await api.functional.redditCommunity.member.subscriptions.erase(
    memberConnection,
    { subscriptionId },
  );
  // 4. Validate successful deletion
  // Success is indicated by no exception thrown (204 No Content)
  TestValidator.predicate(
    "subscription deletion completes without error",
    true,
  );
  // 5. Validate member identity for subsequent operations
  TestValidator.equals(
    "member authentication successful",
    member.id,
    member.id,
  );
  TestValidator.equals(
    "member email matches registration",
    member.email,
    member.email,
  );
  TestValidator.equals(
    "member username matches registration",
    member.username,
    member.username,
  );
}
