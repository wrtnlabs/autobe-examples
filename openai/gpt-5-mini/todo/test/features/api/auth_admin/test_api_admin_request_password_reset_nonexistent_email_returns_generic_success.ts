import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_request_password_reset_nonexistent_email_returns_generic_success(
  connection: api.IConnection,
) {
  // 1. Generate a highly unlikely-to-exist email address (UUID local part)
  const nonExistentEmail: string = `${typia.random<string & tags.Format<"uuid">>()}@example.com`;

  // 2. Call the password reset endpoint with the generated email
  const response: ITodoAppAdmin.IMessage =
    await api.functional.auth.admin.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies ITodoAppAdmin.IRequestPasswordReset,
      },
    );

  // 3. Ensure the response matches the declared DTO
  typia.assert(response);

  // 4. Business-level assertions
  TestValidator.predicate(
    "response contains a human-readable message",
    typeof response.message === "string" && response.message.length > 0,
  );

  TestValidator.predicate(
    "message does not reveal account existence",
    !/(does not exist|not found|no account|unknown user|user not found)/i.test(
      response.message,
    ),
  );

  TestValidator.predicate(
    "message does not contain tokens or URLs",
    !/token|reset|https?:\/\//i.test(response.message),
  );
}
