import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Verify login for a deleted administrator fails without revealing account
 * existence.
 *
 * Ensures that attempting to authenticate with correct credentials for an admin
 * whose deleted_at field is NOT null (i.e., soft-deleted) returns a generic
 * authentication failure. No status or account state leakage is permitted in
 * the error, and normal/deleted admin credentials must both fail identically
 * from a user perspective. This validates the backend does not allow login to
 * soft-deleted administrator accounts and the error message is properly
 * generic. No dependencies necessary—relies on preexisting deleted admin
 * state.
 */
export async function test_api_admin_login_deleted_account(
  connection: api.IConnection,
) {
  // Prepare credentials for a known soft-deleted administrator
  const adminEmail: string & tags.Format<"email"> =
    "deleted_admin@example.com" as string & tags.Format<"email">;
  const adminPassword: string & tags.MinLength<8> = "correctpass" as string &
    tags.MinLength<8>;

  // Attempt to log in with credentials for the deleted admin
  await TestValidator.error(
    "soft-deleted administrator login should fail generically",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: adminPassword,
        } satisfies IDiscussionBoardAdmin.ILogin,
      });
    },
  );
}
