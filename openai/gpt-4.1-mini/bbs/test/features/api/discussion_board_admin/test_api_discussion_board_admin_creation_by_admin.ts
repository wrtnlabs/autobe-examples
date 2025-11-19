import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test the registration process of a new discussion board administrator via the
 * admin join operation.
 *
 * This test authenticates as an admin creating new admin users, ensures unique
 * emails, proper JWT token issuance, and validates role-based access control
 * and account creation.
 *
 * The workflow includes:
 *
 * 1. Admin authentication via join
 * 2. Creating a discussion board admin with random valid credentials
 * 3. Validating creation success and properties
 * 4. Testing duplicate email creation failure
 * 5. Verifying token structure from authentication
 * 6. Attempting unauthorized admin creation and expecting failure
 *
 * All network calls are awaited, with type assertions for response validation,
 * and TestValidator used for comprehensive assertion and error checks.
 */
export async function test_api_discussion_board_admin_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin (dependency)
  const adminAuthResponse = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      nickname: RandomGenerator.name(2),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuthResponse);

  // Step 2: Create a new discussion board admin
  const newAdminEmail = typia.random<string & tags.Format<"email">>();
  const newAdminPassword = "SecurePass123!";
  const createBody = {
    email: newAdminEmail,
    password: newAdminPassword,
    nickname: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.ICreate;

  const createdAdmin =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdAdmin);

  TestValidator.equals(
    "created admin email matches",
    createdAdmin.email,
    createBody.email,
  );
  TestValidator.predicate(
    "created admin has valid id",
    typeof createdAdmin.id === "string" && createdAdmin.id.length > 0,
  );

  // Step 3: Attempt duplicate email creation - should fail
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.discussionBoard.admin.discussionBoardAdmins.create(
      connection,
      {
        body: createBody,
      },
    );
  });

  // Step 4: Verify auth token structure from previous authentication
  TestValidator.predicate(
    "adminAuthResponse has valid token access",
    typeof adminAuthResponse.token.access === "string" &&
      adminAuthResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "adminAuthResponse token has expiry",
    typeof adminAuthResponse.token.expired_at === "string" &&
      adminAuthResponse.token.expired_at.length > 0,
  );

  // Step 5: Validate created timestamps
  TestValidator.predicate(
    "created admin has created_at timestamp",
    typeof createdAdmin.created_at === "string" &&
      createdAdmin.created_at.length > 0,
  );
  TestValidator.predicate(
    "created admin has updated_at timestamp",
    typeof createdAdmin.updated_at === "string" &&
      createdAdmin.updated_at.length > 0,
  );

  // Step 6: Attempt unauthorized creation - simulate unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized admin creation should fail",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardAdmins.create(
        unauthenticatedConnection,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "InvalidPass123!",
            nickname: RandomGenerator.name(2),
          } satisfies IDiscussionBoardAdmin.ICreate,
        },
      );
    },
  );
}
