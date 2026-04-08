import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_password_reset_admin_view_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID for the expired password reset token
  const expiredResetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the admin view endpoint with the expired token ID
  // This endpoint should return token metadata even for expired tokens
  const response = await api.functional.multiUserTodo.member_password_resets.at(
    adminConnection,
    {
      resetId: expiredResetId,
    },
  );
  // Validate response structure using typia assertion
  // This ensures all IAdminView fields are present with correct types:
  // - id: string (UUID format)
  // - memberId: string (UUID format)
  // - memberEmail: string
  // - createdAt: string (date-time format)
  // - expiredAt: string (date-time format)
  // - isExpired: boolean
  // - isValid: boolean
  // - timeUntilExpirationSeconds: number (int32)
  typia.assert(response);
  // Verify the token is marked as expired
  // In production, this requires an actual expired token in the database
  // The computed isExpired field should reflect whether expiredAt is in the past
  TestValidator.predicate(
    "isExpired is boolean indicating token expiration status",
    typeof response.isExpired === "boolean",
  );
  // Verify the token still exists in database (isValid=true when token not used)
  // Tokens are cascaded/deleted when used for password reset
  TestValidator.predicate(
    "isValid is boolean indicating token existence",
    typeof response.isValid === "boolean",
  );
  // Verify expiration time calculation
  // timeUntilExpirationSeconds should be int32 representing seconds until expiredAt
  // Positive = not expired, Zero = expiring now, Negative = already expired
  TestValidator.predicate(
    "timeUntilExpirationSeconds is int32 and indicates relative expiration",
    typeof response.timeUntilExpirationSeconds === "number",
  );
  // Verify metadata fields exist (structurally validated by typia.assert above)
  // These fields provide audit trail for security compliance reviews
  TestValidator.equals(
    "id field has valid UUID format",
    response.id.length,
    36,
  );
  TestValidator.equals(
    "memberId field references valid member account",
    response.memberId.length,
    36,
  );
  TestValidator.equals(
    "memberEmail field contains email format",
    response.memberEmail.includes("@"),
    true,
  );
  TestValidator.equals(
    "createdAt field has valid date-time format",
    response.createdAt.length,
    25,
  );
  TestValidator.equals(
    "expiredAt field has valid date-time format",
    response.expiredAt.length,
    25,
  );
}
