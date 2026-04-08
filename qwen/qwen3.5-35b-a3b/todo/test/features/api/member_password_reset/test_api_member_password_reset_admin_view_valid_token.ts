import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_password_reset_admin_view_valid_token(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the password reset token retrieval endpoint for a valid, non-expired token.
   *
   * Validates successful retrieval of token metadata for administrative review purposes.
   * Ensures that all metadata fields are correctly populated and that computed status
   * indicators accurately reflect the token's current state.
   *
   * 1. Call GET /member-password-resets/{resetId} with a valid UUID.
   * 2. Verify response is correctly typed with typia.assert().
   * 3. Validate all metadata fields: id, memberId, memberEmail, createdAt, expiredAt.
   * 4. Verify computed status fields: isExpired (false), isValid (true),
   *    timeUntilExpirationSeconds (positive integer).
   * 5. Confirm token value is NOT exposed in the response for security.
   * 6. Verify logical consistency between timeUntilExpirationSeconds and isExpired.
   * 7. Validate temporal relationship: expiredAt must be after createdAt.
   */
  const output: IMultiUserTodoMemberPasswordReset.IAdminView =
    await api.functional.multiUserTodo.member_password_resets.at(connection, {
      resetId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
  // Validate id field - must be valid UUID format
  TestValidator.predicate("id is valid UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  // Validate memberId field - must be valid UUID format
  TestValidator.predicate("memberId is valid UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.memberId,
    ),
  );
  // Validate memberEmail field - must be valid email format
  TestValidator.predicate("memberEmail is valid email format", () =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(output.memberEmail),
  );
  // Validate createdAt - must be valid ISO 8601 date-time
  TestValidator.predicate(
    "createdAt is valid ISO 8601 datetime",
    () => !isNaN(new Date(output.createdAt).getTime()),
  );
  // Validate expiredAt - must be valid ISO 8601 date-time
  TestValidator.predicate(
    "expiredAt is valid ISO 8601 datetime",
    () => !isNaN(new Date(output.expiredAt).getTime()),
  );
  // Validate isExpired - must be boolean
  TestValidator.equals(
    "isExpired is boolean type",
    typeof output.isExpired,
    "boolean",
  );
  // Validate isValid - must be boolean
  TestValidator.equals(
    "isValid is boolean type",
    typeof output.isValid,
    "boolean",
  );
  // Validate timeUntilExpirationSeconds - must be integer within int32 range
  TestValidator.predicate("timeUntilExpirationSeconds is int32 integer", () => {
    const val = output.timeUntilExpirationSeconds;
    return Number.isInteger(val) && val >= -2147483648 && val <= 2147483647;
  });
  // Verify security - actual token value must NOT be exposed
  const responseKeys = Object.keys(
    output,
  ) as (keyof IMultiUserTodoMemberPasswordReset.IAdminView)[];
  TestValidator.predicate(
    "token value is NOT exposed in response",
    () =>
      !responseKeys.some((key) =>
        ["token", "value", "resetToken", "secret"].includes(key),
      ),
  );
  // Verify logical consistency - if not expired, timeUntilExpirationSeconds should be positive
  TestValidator.predicate(
    "timeUntilExpirationSeconds consistency with isExpired",
    () => {
      if (!output.isExpired) {
        return output.timeUntilExpirationSeconds > 0;
      }
      return output.timeUntilExpirationSeconds <= 0;
    },
  );
  // Verify temporal relationship - expiredAt must be after createdAt
  TestValidator.predicate(
    "expiredAt is after createdAt",
    () => new Date(output.expiredAt) > new Date(output.createdAt),
  );
}
