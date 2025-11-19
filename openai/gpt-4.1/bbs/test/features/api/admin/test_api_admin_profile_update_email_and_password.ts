import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate administrative profile update for email and password.
 *
 * This e2e test covers the following steps:
 *
 * 1. Registers a new admin account with unique initial credentials.
 * 2. Prepares new email and password for update (distinct from initial values).
 * 3. Performs profile update (PUT) authenticated as this admin.
 * 4. Asserts updated profile reflects new email, timestamps have changed, and ID
 *    is unchanged.
 * 5. Optionally, could be extended to verify that unauthenticated requests are
 *    denied, but core focus is the happy path.
 */
export async function test_api_admin_profile_update_email_and_password(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminEmail1 = typia.random<string & tags.Format<"email">>();
  const adminPassword1 = RandomGenerator.alphaNumeric(10) + "!A";
  const joinPayload = {
    email: adminEmail1,
    password: adminPassword1,
    href: "https://e2e.admin-join/", // random but valid URI
    referrer: "https://e2e.referrer/",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const auth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinPayload,
    });
  typia.assert(auth);
  // 2. Prepare update info (new email/password, both valid)
  const adminEmail2 = typia.random<string & tags.Format<"email">>();
  const adminPassword2 = RandomGenerator.alphaNumeric(12) + "!B";
  const updatePayload = {
    email: adminEmail2,
    password: adminPassword2,
  } satisfies IDiscussionBoardAdmin.IUpdate;
  // 3. Perform update as this authenticated admin
  const result: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.admins.update(connection, {
      adminId: auth.id,
      body: updatePayload,
    });
  typia.assert(result);
  // 4. Assert profile changed as expected
  TestValidator.equals(
    "admin id is unchanged after update",
    result.id,
    auth.id,
  );
  TestValidator.notEquals("admin email changed", result.email, auth.email);
  TestValidator.equals(
    "admin email matches updated value",
    result.email,
    adminEmail2,
  );
  TestValidator.notEquals(
    "updated_at must change after update",
    result.updated_at,
    auth.updated_at,
  );
}
