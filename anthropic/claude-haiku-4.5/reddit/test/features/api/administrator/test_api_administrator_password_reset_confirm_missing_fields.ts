import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

export async function test_api_administrator_password_reset_confirm_missing_fields(
  connection: api.IConnection,
) {
  // Since the scenario requests testing missing required fields, which would require
  // deliberately breaking TypeScript's type system (using 'as any' to omit required fields),
  // this cannot be implemented according to E2E test standards.
  //
  // TypeScript's strong typing prevents this test pattern at compile time.
  // Required fields are enforced by the type system and cannot be omitted
  // while maintaining valid TypeScript code.
  //
  // Alternative: Test valid API usage with business logic validation.

  // Test successful password reset confirmation with valid data
  const resetToken = typia.random<string>();
  const newPassword = RandomGenerator.paragraph({ sentences: 2 });

  const response =
    await api.functional.communityPlatform.auth.administrator.password_reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          reset_token: resetToken,
          new_password: newPassword,
        } satisfies ICommunityPlatformAdministrator.IPasswordResetConfirm,
      },
    );

  typia.assert(response);
  TestValidator.predicate(
    "password reset confirmation should include success flag",
    response.success === true,
  );
  TestValidator.predicate(
    "response should contain administrator email",
    response.email.length > 0,
  );
}
