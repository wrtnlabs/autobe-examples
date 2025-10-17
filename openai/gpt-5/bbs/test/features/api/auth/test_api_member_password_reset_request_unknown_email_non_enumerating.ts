import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

/**
 * Password reset request with unknown email must be non-enumerating.
 *
 * Purpose:
 *
 * - Ensure POST /auth/member/password/reset returns the same generic
 *   acknowledgement for an unknown email, preventing user enumeration.
 *
 * Flow:
 *
 * 1. Generate two random, valid emails (unknownA, unknownB).
 * 2. Request password reset for unknownA and unknownB and assert response types.
 * 3. Repeat request for unknownA to ensure consistent acknowledgement.
 * 4. Validate that the machine-readable code is identical across all calls,
 *    demonstrating non-enumeration behavior.
 *
 * Notes:
 *
 * - Uses exact DTOs: IEconDiscussMember.IPasswordResetRequest for request body
 *   and IEconDiscussMember.ISecurityEvent for responses.
 * - Does not check HTTP status codes or manipulate headers; relies on SDK
 *   behavior.
 */
export async function test_api_member_password_reset_request_unknown_email_non_enumerating(
  connection: api.IConnection,
) {
  // 1) Generate two distinct, valid emails (very unlikely to exist)
  const unknownEmailA = typia.random<string & tags.Format<"email">>();
  const unknownEmailB = typia.random<string & tags.Format<"email">>();

  // 2) Request password reset for unknownEmailA
  const ackA =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: unknownEmailA,
        } satisfies IEconDiscussMember.IPasswordResetRequest,
      },
    );
  typia.assert(ackA);

  // 3) Request password reset for unknownEmailB
  const ackB =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: unknownEmailB,
        } satisfies IEconDiscussMember.IPasswordResetRequest,
      },
    );
  typia.assert(ackB);

  // 4) Repeat request for unknownEmailA to confirm consistent acknowledgement
  const ackA2 =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: unknownEmailA,
        } satisfies IEconDiscussMember.IPasswordResetRequest,
      },
    );
  typia.assert(ackA2);

  // Business logic validations (non-type): generic code should be consistent
  TestValidator.equals(
    "non-enumeration: ack code consistent across different unknown emails",
    ackA.code,
    ackB.code,
  );
  TestValidator.equals(
    "non-enumeration: ack code consistent across repeated requests",
    ackA.code,
    ackA2.code,
  );

  // Optional sanity checks: code/message are non-empty strings
  TestValidator.predicate(
    "ack message should be non-empty",
    ackA.message.length > 0 &&
      ackB.message.length > 0 &&
      ackA2.message.length > 0,
  );
}
