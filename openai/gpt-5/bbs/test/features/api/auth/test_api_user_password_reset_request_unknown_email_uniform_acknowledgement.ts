import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICivicBoardPasswordResetTokenOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardPasswordResetTokenOfUser";

/**
 * Ensure password reset request with an unknown email returns a uniform
 * acknowledgement.
 *
 * Security context:
 *
 * - The endpoint must not disclose whether the submitted email exists.
 * - For any email, the server responds with a standard acknowledgement envelope.
 *
 * Implementation notes:
 *
 * - We cannot create a known user from provided materials, so we validate the
 *   unknown-email path and rely on uniform acknowledgement design.
 * - We assert the response type via typia.assert, which guarantees the envelope
 *   conforms to ICivicBoardPasswordResetTokenOfUser.ISummary.
 * - No HTTP status code assertions; no type-error scenarios.
 */
export async function test_api_user_password_reset_request_unknown_email_uniform_acknowledgement(
  connection: api.IConnection,
) {
  // 1) Prepare an unknown email input
  const unknownEmail1 = typia.random<string & tags.Format<"email">>();
  const body1 = {
    email: unknownEmail1,
  } satisfies ICivicBoardPasswordResetTokenOfUser.IRequest;

  // 2) Request password reset with the unknown email
  const ack1: ICivicBoardPasswordResetTokenOfUser.ISummary =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      { body: body1 },
    );
  typia.assert(ack1);

  // 3) Robustness: repeat with another unknown email to ensure consistent handling
  const unknownEmail2 = typia.random<string & tags.Format<"email">>();
  const body2 = {
    email: unknownEmail2,
  } satisfies ICivicBoardPasswordResetTokenOfUser.IRequest;

  const ack2: ICivicBoardPasswordResetTokenOfUser.ISummary =
    await api.functional.auth.user.password.reset.request.requestPasswordReset(
      connection,
      { body: body2 },
    );
  typia.assert(ack2);
}
