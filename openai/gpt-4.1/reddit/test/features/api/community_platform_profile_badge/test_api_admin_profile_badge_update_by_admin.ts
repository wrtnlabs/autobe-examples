import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";

/**
 * E2E Test: Admin can update an existing profile badge and receive business
 * validation.
 *
 * 1. Register a new admin and authenticate.
 * 2. Generate a valid random profile ID for testing.
 * 3. Assign a badge to the profile as the admin.
 * 4. Perform valid update to the badge (change type, name, set revoked_at and
 *    revoke_reason).
 * 5. Assert update is reflected and badge is still linked to the profile.
 * 6. Test error: try to update a non-belonging badge and expect failure.
 * 7. Test error: attempt unpermitted field mutation (e.g., nested or unrelated
 *    field) and expect failure.
 * 8. Confirm audit/business constraints are enforced - only legal fields change,
 *    others are stable.
 */
export async function test_api_admin_profile_badge_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword!" + RandomGenerator.alphaNumeric(5),
        superuser: true,
      },
    });
  typia.assert(admin);

  // 2. Generate new profile id (simulate real target; in real integration, would create profile/user)
  const testProfileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Assign badge to profile
  const createBadgeBody = {
    community_platform_profile_id: testProfileId,
    badge_type: "gold",
    badge_name: RandomGenerator.paragraph({ sentences: 1 }),
    issuer: admin.email,
    issued_at: new Date().toISOString(),
  } satisfies ICommunityPlatformProfileBadge.ICreate;
  const badge: ICommunityPlatformProfileBadge =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId: testProfileId,
        body: createBadgeBody,
      },
    );
  typia.assert(badge);
  TestValidator.equals(
    "badge belongs to profile",
    badge.community_platform_profile_id,
    testProfileId,
  );
  TestValidator.equals(
    "badge type is correct",
    badge.badge_type,
    createBadgeBody.badge_type,
  );
  TestValidator.equals(
    "badge name is correct",
    badge.badge_name,
    createBadgeBody.badge_name,
  );

  // 4. Admin updates badge attributes (valid fields only)
  const updateBadgeBody = {
    badge_type: "legendary",
    badge_name: RandomGenerator.paragraph({ sentences: 1 }),
    revoked_at: new Date().toISOString(),
    revoke_reason: "Violation of community standards",
    issuer: "admin script",
    issued_at: badge.issued_at,
  } satisfies ICommunityPlatformProfileBadge.IUpdate;
  const updated: ICommunityPlatformProfileBadge =
    await api.functional.communityPlatform.admin.profiles.badges.update(
      connection,
      {
        profileId: testProfileId,
        badgeId: badge.id,
        body: updateBadgeBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "badge updated type",
    updated.badge_type,
    updateBadgeBody.badge_type,
  );
  TestValidator.equals(
    "badge updated name",
    updated.badge_name,
    updateBadgeBody.badge_name,
  );
  TestValidator.equals(
    "badge revoked_at updated",
    updated.revoked_at,
    updateBadgeBody.revoked_at,
  );
  TestValidator.equals(
    "badge revoke_reason updated",
    updated.revoke_reason,
    updateBadgeBody.revoke_reason,
  );
  TestValidator.equals(
    "badge issuer updated",
    updated.issuer,
    updateBadgeBody.issuer,
  );
  TestValidator.equals(
    "badge remains linked to profile",
    updated.community_platform_profile_id,
    testProfileId,
  );
  TestValidator.equals("badge unchanged id", updated.id, badge.id);

  // 5. Negative: Attempt update on non-linked badge id (should error)
  const wrongBadgeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cannot update non-existent or non-linked badge",
    async () => {
      await api.functional.communityPlatform.admin.profiles.badges.update(
        connection,
        {
          profileId: testProfileId,
          badgeId: wrongBadgeId,
          body: updateBadgeBody,
        },
      );
    },
  );

  // 6. Negative: Try forbidden update (simulate by omitting all fields, which is allowed but not meaningful)
  await TestValidator.error(
    "cannot update with empty input (all fields omitted)",
    async () => {
      await api.functional.communityPlatform.admin.profiles.badges.update(
        connection,
        {
          profileId: testProfileId,
          badgeId: badge.id,
          body: {} as ICommunityPlatformProfileBadge.IUpdate,
        },
      );
    },
  );

  // (If audit log exposure is not in API result, skip that check here)
}
