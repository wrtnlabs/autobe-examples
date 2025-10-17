import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";

/**
 * Validate updating information of a redditCommunity administrator by admin ID.
 *
 * Workflow steps:
 *
 * 1. Register a new admin via /auth/admin/join with unique email and password.
 * 2. Login as the created admin via /auth/admin/login to obtain auth token.
 * 3. Create a redditCommunity via /redditCommunity/member/communities with valid
 *    data.
 * 4. Assign a community moderator to the created community via
 *    /redditCommunity/admin/communities/{communityId}/communityModerators.
 * 5. Update the admin's email and admin level by their unique ID via
 *    /redditCommunity/admin/redditCommunityAdmins/{id}.
 * 6. Assert the response confirms updated values and that other data remain
 *    consistent.
 * 7. Test that unauthorized update attempts fail with proper errors.
 */
export async function test_api_reddit_community_admin_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Login as the registered admin
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IRedditCommunityAdmin.ILogin;

  const adminLogin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Create a new redditCommunity
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. Assign a community moderator
  const modCreateBody = {
    member_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    assigned_at: new Date().toISOString(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  await api.functional.redditCommunity.admin.communities.communityModerators.create(
    connection,
    {
      communityId: community.id,
      body: modCreateBody,
    },
  );

  // 5. Update the admin's information
  // Prepare update data with new email and increment admin level (at least 1)
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedAdminLevel = admin.admin_level >= 0 ? admin.admin_level + 1 : 1;
  const adminUpdateBody = {
    email: updatedEmail,
    admin_level: updatedAdminLevel,
  } satisfies IRedditCommunityAdmin.IUpdate;

  const updatedAdmin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.update(
      connection,
      {
        id: admin.id,
        body: adminUpdateBody,
      },
    );
  typia.assert(updatedAdmin);

  // 6. Validate updated admin's data
  TestValidator.equals("admin id match", updatedAdmin.id, admin.id);
  TestValidator.equals("updated email", updatedAdmin.email, updatedEmail);
  TestValidator.equals(
    "updated admin level",
    updatedAdmin.admin_level,
    updatedAdminLevel,
  );
  // Password hash and deleted_at should remain unchanged or null
  TestValidator.equals(
    "password hash unchanged",
    updatedAdmin.password_hash,
    admin.password_hash,
  );
  TestValidator.equals(
    "deleted_at is null",
    updatedAdmin.deleted_at,
    admin.deleted_at,
  );

  // 7. Test unauthorized update attempt
  // Simulate unauthenticated connection with empty headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated user cannot update admin",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunityAdmins.update(
        unauthConnection,
        {
          id: admin.id,
          body: {
            email: typia.random<string & tags.Format<"email">>(),
          },
        },
      );
    },
  );
}
