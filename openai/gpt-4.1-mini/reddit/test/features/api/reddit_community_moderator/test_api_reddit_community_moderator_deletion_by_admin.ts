import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

/**
 * Test permanently deleting a reddit community moderator by an admin.
 *
 * The scenario involves three key steps:
 *
 * 1. Authenticate as an admin user through the join API.
 * 2. Create a reddit community moderator account to be deleted.
 * 3. Perform the deletion of the created reddit community moderator.
 *
 * After each key API call, assert the response types with typia.assert for
 * complete validation. This test ensures that the admin authorization
 * mechanisms work correctly to allow privileged deletion, and that the
 * moderator resource is created and cleaned up as expected.
 */
export async function test_api_reddit_community_moderator_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminEmail = `admin+${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminJoinBody = {
    email: adminEmail,
    password: "securePassword123",
    href: "https://redditCommunity.admin.join",
    referrer: "https://redditCommunity.admin.referrer",
  } satisfies IRedditCommunityAdmin.IJoin;

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create a reddit community moderator to be deleted
  // Use unique moderator email to prevent conflicts
  const modEmail = `mod+${RandomGenerator.alphaNumeric(6)}@example.com`;
  const modCreateBody = {
    email: modEmail,
    password: "moderatorPassword123",
  } satisfies IRedditCommunityModerator.ICreate;

  const moderator: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunityModerators.create(
      connection,
      { body: modCreateBody },
    );
  typia.assert(moderator);

  // 3. Delete the created reddit community moderator by ID
  await api.functional.redditCommunity.admin.redditCommunityModerators.erase(
    connection,
    { id: moderator.id },
  );
}
