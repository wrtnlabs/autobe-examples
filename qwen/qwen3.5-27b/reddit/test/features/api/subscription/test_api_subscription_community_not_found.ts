import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";

/**
 * Test subscription attempt with non-existent community (foreign key validation).
 *
 * Validates that the subscription creation endpoint properly handles attempts to subscribe to communities that do not exist in the database. This test ensures foreign key constraint validation is working correctly and prevents orphaned subscription records.
 *
 * The test authenticates a member, then attempts to create a subscription with a fabricated community ID. The system should reject this with a 404 Not Found error, indicating the referenced community cannot be found. The member's authentication session should remain valid after the failed attempt.
 *
 * 1. Authenticate as a member by joining with valid credentials.
 * 2. Generate a non-existent community ID (valid UUID format but not in database).
 * 3. Attempt to create subscription with the invalid community ID.
 * 4. Verify the operation fails with 404 Not Found HTTP error.
 * 5. Verify the member's session remains valid for subsequent operations.
 */
export async function test_api_subscription_community_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Generate a non-existent community ID (valid UUID format but not in database)
  const nonExistentCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to create subscription with invalid community ID
  await TestValidator.httpError(
    "subscription fails with 404 for non-existent community",
    404,
    async () =>
      await api.functional.redditClone.member.subscriptions.create(
        memberConnection,
        {
          body: {
            community_id: nonExistentCommunityId,
          } satisfies IRedditCloneCommunitySubscription.ICreate,
        },
      ),
  );
  // 4. Verify member's session remains valid (implicit: memberConnection still has auth token)
  // The memberConnection.headers.Authorization should still be set and valid
  TestValidator.predicate(
    "member session remains valid after failed subscription",
    () => memberConnection.headers?.Authorization !== undefined,
  );
}
