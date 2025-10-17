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
 * Validate pending subscription status for private community and idempotency.
 *
 * Steps:
 *
 * 1. Register (join) a member user to obtain authenticated context
 * 2. Create a community with visibility = "private"
 * 3. Subscribe to the private community → expect status "pending"
 * 4. Subscribe again (idempotency) → expect same record id and status "pending"
 */
export async function test_api_subscription_private_community_sets_pending_status(
  connection: api.IConnection,
) {
  // 1) Join/register a member user
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(12), // matches ^[A-Za-z0-9_]{3,20}$
    password: "Abcdef12", // >=8, contains letters and digits
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: true,
  } satisfies ICommunityPlatformMemberUser.ICreate;

  const authorized: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(authorized);

  // 2) Create a private community
  const communityName = `comm_${RandomGenerator.alphaNumeric(10)}`;
  const communityBody = {
    name: communityName,
    display_name: `Display ${communityName}`,
    description: RandomGenerator.paragraph(),
    visibility: "private" as IECommunityVisibility,
    nsfw: false,
    auto_archive_days: 30,
    language: "en",
    region: "US",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3) Subscribe to the private community → expect pending
  const sub1: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.memberUser.communities.subscribe.create(
      connection,
      { communityId: community.id },
    );
  typia.assert(sub1);

  TestValidator.equals(
    "subscription references the created community",
    sub1.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    'subscription status is "pending" for private community',
    sub1.status,
    "pending",
  );

  // 4) Idempotency: calling subscribe again should be stable
  const sub2: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.memberUser.communities.subscribe.create(
      connection,
      { communityId: community.id },
    );
  typia.assert(sub2);

  TestValidator.equals(
    "idempotent subscribe returns same subscription id",
    sub2.id,
    sub1.id,
  );
  TestValidator.equals(
    "idempotent subscribe keeps community reference",
    sub2.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    'idempotent subscribe keeps status "pending"',
    sub2.status,
    "pending",
  );
}
