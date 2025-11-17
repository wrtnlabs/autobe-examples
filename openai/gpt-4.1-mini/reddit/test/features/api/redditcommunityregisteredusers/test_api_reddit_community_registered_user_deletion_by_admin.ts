import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";

/**
 * Test deletion of a registered user account by an authorized admin in the
 * RedditCommunity platform.
 *
 * This test function covers the entire lifecycle of admin registration and
 * authentication, followed by the hard deletion of a registered user account
 * identified by its UUID. It ensures that access control is strictly enforced,
 * only allowing deletion by authorized admins.
 *
 * The test sequence is:
 *
 * 1. Register a new admin with a random but realistic join request including
 *    email, password, href, and referrer.
 * 2. Authenticate the admin, verifying that the authorized admin info and tokens
 *    are correctly issued.
 * 3. Attempt to delete a random user ID as the authorized admin.
 * 4. Confirm the deletion operation completes without errors, validating full
 *    removal.
 *
 * This ensures the sensitive operation of user deletion is reserved for admins
 * and enforces system integrity.
 *
 * @param connection Auto-managed API connection supporting authentication.
 */
export async function test_api_reddit_community_registered_user_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registration (join) with realistic data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: `https://redditcommunity.example.com/join`,
    referrer: `https://redditcommunity.example.com`,
  } satisfies IRedditCommunityAdmin.IJoin;

  const authorizedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  // Validate returned admin info and tokens
  typia.assert(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // Step 2: Use the authorized admin context for further requests
  // The SDK automatically manages token in the connection headers

  // Step 3: Perform a hard delete (erase) by admin on a random registered user ID
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.redditCommunity.admin.redditCommunityRegisteredusers.erase(
    connection,
    {
      id: targetUserId,
    },
  );
  // No output expected, operation completes without error
  // Full removal is verified by absence of errors
}
