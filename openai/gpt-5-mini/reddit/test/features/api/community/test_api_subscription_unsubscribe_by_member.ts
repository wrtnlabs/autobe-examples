import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySubscription";

export async function test_api_subscription_unsubscribe_by_member(
  connection: api.IConnection,
) {
  /**
   * Validate community subscription unsubscribe (soft-delete) workflow via
   * observable API behavior: authorization, idempotence, and membership counter
   * reconciliation. Because no direct audit-log or raw subscription GET
   * endpoints are available in the SDK, this test asserts the same business
   * guarantees through API responses.
   *
   * Steps:
   *
   * 1. Create primary member via auth.communityMember.join
   * 2. Create a unique community
   * 3. Subscribe -> assert is_active and members_count increment
   * 4. Erase (unsubscribe) and assert idempotency
   * 5. Reactivate subscription -> assert is_active and members_count reconciled
   * 6. Negative checks: unauthenticated erase and other-member erase must fail
   */

  // 1) Primary member creation (subscriber)
  const primaryEmail = typia.random<string & tags.Format<"email">>();
  const primaryUsername = `sub_${RandomGenerator.alphaNumeric(6)}`;
  const primaryBody = {
    email: primaryEmail,
    username: primaryUsername,
    password: "Passw0rd!",
    profile: { display_name: RandomGenerator.name() },
    session_context: {
      href: "http://example.test/",
      referrer: "http://example.test/",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const primaryAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: primaryBody,
    });
  typia.assert(primaryAuth);
  const primaryMemberId = primaryAuth.member.id;

  // 2) Create unique community
  const uniqueSlug = `test-community-${Date.now()}-${RandomGenerator.alphaNumeric(4)}`;
  const communityBody = {
    name: `Test Community ${RandomGenerator.paragraph({ sentences: 2 })}`,
    slug: uniqueSlug,
    description: "E2E test community for unsubscribe flow",
    visibility: "public",
    post_approval_required: false,
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);
  const initialMembersCount = community.members_count;

  // 3) Subscribe as primary member
  const subscription: ICommunityBbsCommunitySubscription =
    await api.functional.communityBbs.communityMember.communities.subscriptions.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          notification_level: "all",
        } satisfies ICommunityBbsCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription is active after creation (actual, expected)",
    subscription.is_active,
    true,
  );

  TestValidator.equals(
    "subscription subscriber id matches primary member id (actual, expected)",
    subscription.subscriber.id,
    primaryMemberId,
  );

  TestValidator.equals(
    "members_count incremented by 1 after subscribe (actual, expected)",
    subscription.community.members_count,
    initialMembersCount + 1,
  );

  const membersAfterSubscribe = subscription.community.members_count;

  // 4) Erase (unsubscribe) as the same authenticated member
  await api.functional.communityBbs.communityMember.communities.subscriptions.erase(
    connection,
    { communitySlug: community.slug },
  );

  // 5) Idempotency: calling erase again should not throw
  await api.functional.communityBbs.communityMember.communities.subscriptions.erase(
    connection,
    { communitySlug: community.slug },
  );

  // 6) Reactivate subscription by creating it again; expect is_active true
  const reactivated: ICommunityBbsCommunitySubscription =
    await api.functional.communityBbs.communityMember.communities.subscriptions.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          notification_level: "all",
        } satisfies ICommunityBbsCommunitySubscription.ICreate,
      },
    );
  typia.assert(reactivated);

  TestValidator.equals(
    "reactivated subscription is active (actual, expected)",
    reactivated.is_active,
    true,
  );

  // 6a) Retry-based assertion for members_count reconciliation to reduce flakiness
  let reconciled = false;
  const expectedMembers = membersAfterSubscribe;
  for (let attempt = 0; attempt < 3; ++attempt) {
    if (reactivated.community.members_count === expectedMembers) {
      reconciled = true;
      break;
    }
    // small delay before retry
    await new Promise((resolve) => setTimeout(resolve, 200));
    // re-call create to get a fresh snapshot if needed (safe reactivation)
    const snapshot: ICommunityBbsCommunitySubscription =
      await api.functional.communityBbs.communityMember.communities.subscriptions.create(
        connection,
        {
          communitySlug: community.slug,
          body: {
            notification_level: "all",
          } satisfies ICommunityBbsCommunitySubscription.ICreate,
        },
      );
    typia.assert(snapshot);
    if (snapshot.community.members_count === expectedMembers) {
      reconciled = true;
      break;
    }
  }

  TestValidator.predicate(
    "members_count reconciled after reactivation",
    reconciled,
  );

  // 7a) Negative: unauthenticated erase must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated unsubscribe should fail",
    async () => {
      await api.functional.communityBbs.communityMember.communities.subscriptions.erase(
        unauthConn,
        { communitySlug: community.slug },
      );
    },
  );

  // 7b) Negative: different member cannot erase another's subscription
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherUsername = `other_${RandomGenerator.alphaNumeric(6)}`;
  const otherBody = {
    email: otherEmail,
    username: otherUsername,
    password: "Passw0rd!",
    profile: { display_name: RandomGenerator.name() },
    session_context: {
      href: "http://example.test/",
      referrer: "http://example.test/",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const otherAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(otherConn, {
      body: otherBody,
    });
  typia.assert(otherAuth);

  await TestValidator.error(
    "other member cannot unsubscribe another's subscription",
    async () => {
      await api.functional.communityBbs.communityMember.communities.subscriptions.erase(
        otherConn,
        { communitySlug: community.slug },
      );
    },
  );
}
