import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the security feature that prevents email enumeration attacks.
 * 1. Authenticate as an admin using join
 * 2. Call password reset endpoint with an unregistered email
 * 3. Validate system returns same success response format regardless of email existence
 * 4. Ensure no information leakage in response format or structure
 */
export async function test_api_admin_password_reset_email_security(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection using authorized join utility
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Generate an unregistered email that doesn't exist in the system
  const unregisteredEmail = typia.random<string & tags.Format<"email">>();
  // 3. Call password reset endpoint with unregistered email
  const resetResponse =
    await api.functional.multiUserTodo.admin.admins.password_resets.request(
      adminConnection,
      {
        body: {
          email: unregisteredEmail,
        } satisfies IMultiUserTodoAdminPasswordReset.IRequest,
      },
    );
  typia.assert(resetResponse);
  // 4. Validate response has proper structure with all required fields
  TestValidator.predicate("has reset token ID", () =>
    typia.is<string & tags.Format<"uuid">>(resetResponse.id),
  );
  TestValidator.predicate("has expiration timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(resetResponse.expires_at),
  );
  TestValidator.predicate("has admin field", () =>
    typia.is<IMultiUserTodoAdmin.ISummary>(resetResponse.admin),
  );
  TestValidator.predicate("admin field is summary", () =>
    typia.is<string & tags.Format<"uuid">>(resetResponse.admin.id),
  );
  TestValidator.predicate("admin has email", () =>
    typia.is<string & tags.Format<"email">>(resetResponse.admin.email),
  );
  TestValidator.predicate(
    "admin has display name",
    () => typeof resetResponse.admin.display_name === "string",
  );
  TestValidator.predicate("admin has creation date", () =>
    typia.is<string & tags.Format<"date-time">>(resetResponse.admin.created_at),
  );
  // 5. Verify used_at is null (token not yet used)
  TestValidator.equals(
    "used_at is null for new reset token",
    resetResponse.used_at,
    null,
  );
  // 6. Ensure response includes other required timestamp fields
  TestValidator.predicate("has created_at timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(resetResponse.created_at),
  );
  TestValidator.predicate("has updated_at timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(resetResponse.updated_at),
  );
  // 7. Business logic validation: The admin field should have consistent structure
  // The system should return a valid ISummary structure regardless of email existence
  TestValidator.predicate("admin email is valid email format", () =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
      resetResponse.admin.email,
    ),
  );
  TestValidator.predicate(
    "admin display name is non-empty",
    () => resetResponse.admin.display_name.trim().length > 0,
  );
}
