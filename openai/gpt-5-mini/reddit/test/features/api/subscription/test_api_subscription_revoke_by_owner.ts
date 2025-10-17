import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

/**
 * Validate subscription revocation by subscription owner.
 *
 * Business purpose:
 *
 * - Confirms that the owner of a subscription can revoke (soft-delete) it.
 * - Validates idempotent behavior of the revoke endpoint by calling DELETE twice.
 * - Verifies access control by ensuring other authenticated members and
 *   unauthenticated clients cannot revoke the owner's subscription.
 *
 * Implementation notes:
 *
 * - Uses only provided SDK functions: auth.member.join, communities.create,
 *   communities.subscriptions.create, and member.subscriptions.erase.
 * - Because no GET subscription endpoint is available in the SDK, the test
 *   asserts the subscription's initial deleted_at is null (from create
 *   response) and verifies idempotency plus authorization protections via
 *   attempted DELETE calls and expected error behavior.
 */
export async function test_api_subscription_revoke_by_owner(
  connection: api.IConnection,
) {
  // 1. Prepare isolated connections for different roles
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Register owner account
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerUsername = RandomGenerator.name(2);
  const ownerAuth: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(ownerConn, {
      body: {
        username: ownerUsername,
        email: ownerEmail,
        password: "P@ssw0rd!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(ownerAuth);

  // 3. Create a community as the owner
  const communityCreateBody = {
    name: `test-community-${RandomGenerator.alphaNumeric(6)}`,
    // Let the server canonicalize slug if needed; provide visibility fields
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(ownerConn, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 4. Create subscription as the owner
  const subscriptionCreateBody = {
    community_id: community.id,
  } satisfies ICommunityPortalSubscription.ICreate;

  const subscription: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      ownerConn,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // Business assertion: subscription should initially not be deleted
  TestValidator.equals(
    "subscription initially not deleted",
    subscription.deleted_at,
    null,
  );

  // 5. Owner revokes subscription (soft-delete)
  await api.functional.communityPortal.member.subscriptions.erase(ownerConn, {
    subscriptionId: subscription.id,
  });

  // 6. Idempotency: Revoke same subscription again — should not throw
  await api.functional.communityPortal.member.subscriptions.erase(ownerConn, {
    subscriptionId: subscription.id,
  });
  TestValidator.predicate(
    "revoke is idempotent when called a second time",
    true,
  );

  // 7. Negative: other authenticated member cannot revoke owner's subscription
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherUsername = RandomGenerator.name(2);
  const otherAuth: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(otherConn, {
      body: {
        username: otherUsername,
        email: otherEmail,
        password: "P@ssw0rd!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(otherAuth);

  await TestValidator.error(
    "other member cannot revoke another user's subscription",
    async () => {
      await api.functional.communityPortal.member.subscriptions.erase(
        otherConn,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );

  // 8. Negative: unauthenticated client cannot revoke subscription
  await TestValidator.error(
    "unauthenticated client cannot revoke subscription",
    async () => {
      await api.functional.communityPortal.member.subscriptions.erase(
        unauthConn,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
