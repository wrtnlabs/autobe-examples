import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Subscribe a member user to an existing community (happy path with
 * idempotency).
 *
 * Steps:
 *
 * 1. Register a new member user and obtain an authenticated context (token handled
 *    by SDK)
 * 2. Create a new public community as the authenticated member
 * 3. Subscribe to that community
 * 4. Call subscribe again to verify idempotency (no duplicate, same subscription
 *    id)
 *
 * Validations:
 *
 * - All responses conform to their DTOs via typia.assert
 * - Referential integrity: subscription.community_platform_community_id ==
 *   community.id
 * - Idempotency: subsequent subscribe returns the same subscription id and
 *   consistent core fields
 */
export async function test_api_subscription_create_by_member_to_existing_community(
  connection: api.IConnection,
) {
  // 1) Register a new member user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = `user_${RandomGenerator.alphaNumeric(8)}`; // matches ^[A-Za-z0-9_]{3,20}$
  const password: string = `P4ssw0rd${RandomGenerator.alphaNumeric(8)}`; // ≥8 chars, includes letters and digits

  const memberAuth: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        email,
        username,
        password,
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted_at: new Date().toISOString(),
        marketing_opt_in: false,
      } satisfies ICommunityPlatformMemberUser.ICreate,
    });
  typia.assert(memberAuth);

  // 2) Create a community (public for immediate subscription)
  const communityHandle: string = `c_${RandomGenerator.alphaNumeric(12)}`; // unique-ish handle
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: communityHandle,
          visibility: "public",
          nsfw: false,
          auto_archive_days: 30,
          display_name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          language: "en",
          region: "US",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Subscribe to the created community
  const sub1: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.memberUser.communities.subscribe.create(
      connection,
      { communityId: community.id },
    );
  typia.assert(sub1);

  // Business validations
  TestValidator.equals(
    "subscription community id should match created community",
    sub1.community_platform_community_id,
    community.id,
  );

  // 4) Idempotency: repeat subscribe and expect stable result
  const sub2: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.memberUser.communities.subscribe.create(
      connection,
      { communityId: community.id },
    );
  typia.assert(sub2);

  TestValidator.equals(
    "idempotent subscribe should return same subscription id",
    sub2.id,
    sub1.id,
  );
  TestValidator.equals(
    "idempotent subscribe keeps same community reference",
    sub2.community_platform_community_id,
    sub1.community_platform_community_id,
  );
  TestValidator.equals(
    "idempotent subscribe keeps status stable",
    sub2.status,
    sub1.status,
  );
  TestValidator.equals(
    "idempotent subscribe keeps muted flag stable",
    sub2.muted,
    sub1.muted,
  );
}
