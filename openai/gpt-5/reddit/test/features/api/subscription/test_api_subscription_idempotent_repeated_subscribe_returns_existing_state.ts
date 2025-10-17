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
 * Verify idempotent subscription creation for a member user.
 *
 * Workflow
 *
 * 1. Join as a member user (token is attached to connection by SDK).
 * 2. Create a community with valid required fields.
 * 3. Subscribe to the community and capture the result.
 * 4. Subscribe again to the same community and verify the mapping is identical
 *    (same subscription id and community id), demonstrating idempotency and
 *    absence of duplicate records.
 *
 * Assertions
 *
 * - All API responses are type-validated with typia.assert().
 * - Second subscribe returns the same mapping id and the same community id.
 * - Basic state stability checks (status, muted) across repeated calls.
 */
export async function test_api_subscription_idempotent_repeated_subscribe_returns_existing_state(
  connection: api.IConnection,
) {
  // 1) Register and authenticate a member user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = `${RandomGenerator.alphabets(1)}_${RandomGenerator.alphaNumeric(7)}`; // 9 chars, [a-z]_alnum
  const password: string = `A1${RandomGenerator.alphaNumeric(8)}`; // ensure >=8, has letter and digit
  const nowIso: string = new Date().toISOString();

  const member = await api.functional.auth.memberUser.join(connection, {
    body: {
      email,
      username,
      password,
      terms_accepted_at: nowIso,
      privacy_accepted_at: nowIso,
      marketing_opt_in: false,
    } satisfies ICommunityPlatformMemberUser.ICreate,
  });
  typia.assert(member);

  // 2) Create a community for the subscription
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(10)}`,
          visibility: "public",
          nsfw: false,
          auto_archive_days: 30,
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          language: "en",
          region: "US",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) First subscribe
  const first: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.memberUser.communities.subscribe.create(
      connection,
      { communityId: community.id },
    );
  typia.assert(first);

  // 4) Second subscribe (idempotent)
  const second: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.memberUser.communities.subscribe.create(
      connection,
      { communityId: community.id },
    );
  typia.assert(second);

  // Idempotency and consistency validations
  TestValidator.equals(
    "second subscribe returns the same subscription id",
    second.id,
    first.id,
  );
  TestValidator.equals(
    "community id in subscription remains the same",
    second.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "first subscription targets the same community id",
    first.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "status remains stable across repeated subscribe",
    second.status,
    first.status,
  );
  TestValidator.equals(
    "muted flag remains stable across repeated subscribe",
    second.muted,
    first.muted,
  );
}
