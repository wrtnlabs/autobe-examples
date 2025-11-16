import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Ensure platform admin cannot view a non-existent community-level ban for a
 * member user.
 *
 * Business goal
 *
 * - Validate that GET
 *   /communityPlatform/platformAdmin/memberUsers/{memberUserId}/communityBans/{banId}
 *   fails with an error when the (memberUserId, banId) combination does not
 *   correspond to any existing community-level ban, and that no ban payload is
 *   returned.
 *
 * High-level flow
 *
 * 1. Register a platform administrator via /auth/platformAdmin/join to obtain
 *    platformAdmin context.
 * 2. (Optional realism) Create basic master data: an account status and a
 *    community visibility level.
 * 3. Register a member user via /auth/memberUser/join to obtain a fresh
 *    memberUserId with no bans.
 * 4. Re-authenticate as a platform administrator so the SDK Authorization header
 *    represents platformAdmin.
 * 5. Generate a random UUID to use as a non-existent banId.
 * 6. Call GET
 *    /communityPlatform/platformAdmin/memberUsers/{memberUserId}/communityBans/{banId}
 *    inside TestValidator.error and assert that the call throws, indicating
 *    not-found style behavior.
 */
export async function test_api_platform_admin_cannot_view_nonexistent_community_ban(
  connection: api.IConnection,
) {
  // 1. Initial platform admin registration (establish platformAdmin auth context)
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/landing",
    ip: "203.0.113.10",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 2. Optional realism: create an account status master record
  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(5)}`,
    label: "Active",
    description:
      "Active account status for testing non-existent community bans.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert(accountStatus);

  // 3. Optional realism: create a community visibility level master record
  const visibilityLevelBody = {
    code: `public_${RandomGenerator.alphabets(5)}`,
    name: "Public test visibility",
    description:
      "Visibility level used in tests for non-existent community bans.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelBody },
    );
  typia.assert(visibilityLevel);

  // 4. Register a member user; this will switch Authorization to memberUser
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://community.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://community.example.com/landing" as string &
      tags.Format<"uri">,
    ip: "198.51.100.20",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  const memberUserId = memberAuth.id;

  // 5. Re-authenticate as platform admin so that subsequent calls use platformAdmin actor
  const secondAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/join2",
    referrer: "https://admin-console.example.com/landing2",
    ip: "203.0.113.11",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const secondPlatformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: secondAdminJoinBody,
    });
  typia.assert(secondPlatformAdminAuth);

  // 6. Generate a random, non-existent community ban ID
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();

  // 7. Attempt to fetch the non-existent community ban and assert that it errors
  await TestValidator.error(
    "platform admin cannot view a non-existent community ban for a member user",
    async () => {
      await api.functional.communityPlatform.platformAdmin.memberUsers.communityBans.at(
        connection,
        {
          memberUserId,
          banId: nonExistentBanId,
        },
      );
    },
  );
}
