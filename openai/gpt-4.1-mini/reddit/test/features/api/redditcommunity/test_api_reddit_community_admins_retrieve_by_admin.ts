import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";

/**
 * Tests that an authenticated admin user can retrieve detailed information
 * about a Reddit Community Administrator by ID.
 *
 * This test covers the following steps:
 *
 * 1. Admin authentication to gain access.
 * 2. Creating a new admin account.
 * 3. Retrieving the created admin's details by its ID.
 * 4. Validating the integrity of the returned data, ensuring it contains the
 *    correct fields, with correct types and expected values, and excludes
 *    sensitive fields like password hashes.
 */
export async function test_api_reddit_community_admins_retrieve_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminAuth: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: `admin-${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "StrongPass123!",
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/register",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(adminAuth);

  // Switch context - subsequent requests run authenticated as admin
  // Note: The SDK automatically handles auth token in headers

  // Step 2: Create a new admin to retrieve
  const newAdmin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.create(
      connection,
      {
        body: {
          email: `user-${RandomGenerator.alphaNumeric(8)}@example.com`,
          password: "UserPass456!",
        } satisfies IRedditCommunityAdmin.ICreate,
      },
    );
  typia.assert(newAdmin);

  // Step 3: Retrieve the admin by ID
  const retrievedAdmin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.at(
      connection,
      {
        id: newAdmin.id,
      },
    );
  typia.assert(retrievedAdmin);

  // Step 4: Validate returned information
  TestValidator.equals(
    "retrieved admin ID matches created admin ID",
    retrievedAdmin.id,
    newAdmin.id,
  );
  TestValidator.equals(
    "retrieved admin email matches created admin email",
    retrievedAdmin.email,
    newAdmin.email,
  );
  TestValidator.predicate(
    "retrieved created_at is ISO date string",
    typeof retrievedAdmin.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        retrievedAdmin.created_at,
      ),
  );
  TestValidator.predicate(
    "retrieved updated_at is ISO date string",
    typeof retrievedAdmin.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        retrievedAdmin.updated_at,
      ),
  );

  TestValidator.predicate(
    "deleted_at is null or ISO date string if present",
    retrievedAdmin.deleted_at === null ||
      retrievedAdmin.deleted_at === undefined ||
      (typeof retrievedAdmin.deleted_at === "string" &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
          retrievedAdmin.deleted_at,
        )),
  );
}
