import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_admin_registration(connection: api.IConnection) {
  // Step 1: Prepare valid join info with unique email and strong password
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;

  // Step 2: Call admin join API
  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(authorizedAdmin);

  // Verify fields
  TestValidator.predicate(
    "valid uuid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      authorizedAdmin.id,
    ),
  );
  TestValidator.equals(
    "email matches input",
    authorizedAdmin.email,
    adminJoinBody.email,
  );
  TestValidator.predicate(
    "hashed password non-empty",
    typeof authorizedAdmin.password_hash === "string" &&
      authorizedAdmin.password_hash.length > 0,
  );
  TestValidator.equals(
    "displayName matches input",
    authorizedAdmin.display_name,
    adminJoinBody.displayName,
  );
  TestValidator.predicate(
    "created_at valid ISO",
    typeof authorizedAdmin.created_at === "string" &&
      authorizedAdmin.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at valid ISO",
    typeof authorizedAdmin.updated_at === "string" &&
      authorizedAdmin.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at null or undefined",
    authorizedAdmin.deleted_at === null ||
      authorizedAdmin.deleted_at === undefined,
  );
  TestValidator.predicate(
    "token object present",
    typeof authorizedAdmin.token === "object",
  );
  TestValidator.predicate(
    "token.access non-empty",
    typeof authorizedAdmin.token.access === "string" &&
      authorizedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh non-empty",
    typeof authorizedAdmin.token.refresh === "string" &&
      authorizedAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at valid",
    typeof authorizedAdmin.token.expired_at === "string" &&
      authorizedAdmin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until valid",
    typeof authorizedAdmin.token.refreshable_until === "string" &&
      authorizedAdmin.token.refreshable_until.length > 0,
  );

  // Step 3: Attempt duplicate join with same email to test uniqueness
  await TestValidator.error("duplicate email join should fail", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminJoinBody.email,
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  });
}
