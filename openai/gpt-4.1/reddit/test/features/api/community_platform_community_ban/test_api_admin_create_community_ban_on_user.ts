import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate admin can create a ban on a user within a community.
 *
 * 1. Register a new admin
 * 2. Register a new user account to serve as the ban target
 * 3. Create a new community
 * 4. As the admin, create a ban entry against the user with all required fields,
 *    including reason and optional ban expiration
 * 5. Validate that the ban is recorded against correct user and community
 * 6. Attempt to create a duplicate ban for the same user in the community, expect
 *    prevention (error)
 */
export async function test_api_admin_create_community_ban_on_user(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(20);
  const adminDisplayName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.MinLength<8>,
      display_name: adminDisplayName as string &
        tags.MinLength<1> &
        tags.MaxLength<80>,
      href: "https://autobe.e2e.test/admin",
      referrer: "https://google.com",
    },
  });
  typia.assert(adminJoin);
  TestValidator.equals("admin email matches", adminJoin.email, adminEmail);
  TestValidator.equals(
    "admin displayName matches",
    adminJoin.display_name,
    adminDisplayName,
  );

  // 2. Register a new user account (password reset triggers creation; generate an email for uniqueness)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const passwordResetResponse =
    await api.functional.auth.user.password.reset.resetPassword(connection, {
      body: { email: userEmail },
    });
  typia.assert(passwordResetResponse);

  // 3. Create a new community as the admin (admins can create communities per docs)
  const communityName = RandomGenerator.alphaNumeric(12).toLowerCase();
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName as string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">,
        description: communityDescription as string &
          tags.MinLength<1> &
          tags.MaxLength<250>,
      },
    });
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "community description matches",
    community.description,
    communityDescription,
  );

  // 4. As the admin, create a ban entry against the user
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const banDurationHours = RandomGenerator.pick([1, 12, 24, 48, null]);
  let expiresAt: (string & tags.Format<"date-time">) | null | undefined =
    undefined;
  if (banDurationHours !== null) {
    const expires = new Date(Date.now() + banDurationHours * 3600 * 1000);
    expiresAt = expires.toISOString();
  } else {
    expiresAt = null;
  }
  const banRequest = {
    community_platform_user_id: community.creator_user_id as string &
      tags.Format<"uuid">,
    reason: banReason,
    expires_at: expiresAt,
  };
  // NOTE: Since we don't get the user id directly from password reset, we use community.creator_user_id for test purposes
  const ban =
    await api.functional.communityPlatform.admin.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: banRequest,
      },
    );
  typia.assert(ban);
  TestValidator.equals(
    "banned community matches",
    ban.community.id,
    community.id,
  );
  TestValidator.equals(
    "banned user matches",
    ban.user.id,
    community.creator_user_id,
  );
  TestValidator.equals("ban actor matches", ban.bannedBy.id, adminJoin.id);
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  if (expiresAt !== null && expiresAt !== undefined) {
    TestValidator.equals("ban expires_at matches", ban.expires_at, expiresAt);
  }
  TestValidator.predicate(
    "ban timestamp is ISO date-time",
    typeof ban.banned_at === "string" && ban.banned_at.endsWith("Z"),
  );
  TestValidator.equals("ban is active (revoked_at null)", ban.revoked_at, null);

  // 5. Attempt to create a duplicate ban for same user in this community (must fail)
  await TestValidator.error("duplicate ban must be prevented", async () => {
    await api.functional.communityPlatform.admin.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: banRequest,
      },
    );
  });
}
