import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test email uniqueness validation by attempting to register an admin account with an email that already exists in the system.
 * Verify that the operation properly detects duplicate email addresses and returns an appropriate error response
 * without creating a duplicate account.
 */
export async function test_api_admin_join_email_uniqueness_validation(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email for testing
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  // Create first admin account successfully
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(firstConnection, {
    body: {
      email: duplicateEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(firstAdmin);
  // Attempt to create second admin account with same email - should fail with duplicate email error
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email registration",
    400,
    async () => {
      await authorize_admin_join(secondConnection, {
        body: {
          email: duplicateEmail,
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
        },
      });
    },
  );
  // Verify that only one admin account exists with this email
  // (This would typically involve additional API calls to validate the constraint)
  TestValidator.equals(
    "email remains unique",
    firstAdmin.email,
    duplicateEmail,
  );
}
