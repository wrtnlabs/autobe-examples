import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

/**
 * Test the retrieval of a single admin user by admin ID.
 *
 * This test authenticates a new admin user via the join endpoint, retrieves the
 * newly created admin's unique ID, and then fetches the admin details by the
 * GET endpoint providing adminId as path parameter. It validates the admin
 * entity's user linkage, the presence of creation timestamp, and the overall
 * response structure according to the DTO.
 *
 * Steps:
 *
 * 1. Call auth.admin.join to create and authenticate as a new admin
 * 2. Extract the admin ID from the response
 * 3. Call redditCommunity.admin.admins.at with the adminId
 * 4. Assert the response has correct user_id referenced and created_at timestamp
 * 5. Validate the entire response structure with typia.assert
 */
export async function test_api_admin_admins_at(connection: api.IConnection) {
  // 1. Create and authenticate admin via join
  const createBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityAdmin.ICreate;
  const authorizedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: createBody });
  typia.assert(authorizedAdmin);

  // 2. Obtain adminId
  const adminId = authorizedAdmin.id;

  // 3. Retrieve admin details by GET endpoint
  const adminDetails: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.admins.at(connection, {
      adminId,
    });
  typia.assert(adminDetails);

  // 4. Check that returned admin matches created user linkage and has created_at timestamp
  TestValidator.equals(
    "admin user_id matches",
    adminDetails.user_id,
    createBody.user_id,
  );
  TestValidator.equals("admin id matches", adminDetails.id, adminId);
  TestValidator.predicate(
    "admin has valid created_at datetime",
    typeof adminDetails.created_at === "string" &&
      adminDetails.created_at.length > 0,
  );
}
