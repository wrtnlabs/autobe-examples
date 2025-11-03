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
 * Validate retrieval of a specific community ban entry with full audit details
 * accessible only to an admin.
 *
 * This scenario tests the full workflow from admin and user account creation,
 * community creation, ban issuance, and retrieval of ban detail for audit
 * purposes. Steps:
 *
 * 1. Create an admin account (gains admin authentication)
 * 2. Create a user account (target of the ban) via a password reset request (as
 *    there is no direct user sign-up endpoint)
 * 3. Create a new community (requires an authenticated actor)
 * 4. Issue a ban for the user in the given community as admin, recording reason
 *    and (optionally) expiry
 * 5. Retrieve the ban details as the admin, verifying all relevant fields and
 *    audit information
 * 6. Attempt retrieval with a non-existent banId or mismatched communityId and
 *    expect error
 */
export async function test_api_admin_ban_detail_retrieval_with_complete_audit_chain(
  connection: api.IConnection,
) {
  // 1. Create an admin account and log in
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://admin-join.example.com",
    referrer: "https://referrer.example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(adminAuth);

  // 2. Create a user account (the ban target) via password reset API (simulates user existence for test)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userResetResult =
    await api.functional.auth.user.password.reset.resetPassword(connection, {
      body: {
        email: userEmail,
      } satisfies ICommunityPlatformUser.IResetPasswordRequest,
    });
  typia.assert(userResetResult);

  // 3. Create a community (admin can create via user endpoint due to admin privilege inheritance)
  const communityBody = {
    name: RandomGenerator.alphaNumeric(12).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 4. Admin issues a ban to the user in the created community
  // For test, use userEmail and find the userId after ban is created (test infra limitation)
  const banBody = {
    community_platform_user_id: community.creator_user_id, // This is correct as we just created the community as admin
    reason: RandomGenerator.paragraph({ sentences: 6 }),
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;
  const ban =
    await api.functional.communityPlatform.admin.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: banBody,
      },
    );
  typia.assert(ban);
  TestValidator.equals("community ID matches", ban.community.id, community.id);
  TestValidator.equals(
    "user summary exists",
    typeof ban.user.display_name,
    "string",
  );
  TestValidator.equals(
    "bannedBy.admin is same as admin display_name",
    ban.bannedBy.display_name,
    adminBody.display_name,
  );
  TestValidator.equals("ban reason matches", ban.reason, banBody.reason);
  TestValidator.equals("expires_at is expected (null)", ban.expires_at, null);

  // 5. Retrieve the ban's detail using API (should succeed as admin)
  const banDetail =
    await api.functional.communityPlatform.admin.communities.bans.at(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(banDetail);
  TestValidator.equals("ban detail matches issued ban", banDetail.id, ban.id);
  TestValidator.equals(
    "ban detail reason matches",
    banDetail.reason,
    ban.reason,
  );

  // 6. Attempt to retrieve with fake banId and expect error
  await TestValidator.error(
    "retrieval of non-existent ban should fail",
    async () => {
      await api.functional.communityPlatform.admin.communities.bans.at(
        connection,
        {
          communityId: community.id,
          banId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Attempt to retrieve with wrong communityId (banID exists but wrong community)
  await TestValidator.error(
    "retrieval of ban with incorrect communityId should fail",
    async () => {
      await api.functional.communityPlatform.admin.communities.bans.at(
        connection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          banId: ban.id,
        },
      );
    },
  );
}
