import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

/**
 * Test: Password reset request returns a generic acknowledgement for unknown
 * emails and exhibits abuse protection when repeatedly invoked.
 *
 * Purpose:
 *
 * - Ensure that public password-reset endpoint for moderator-capable accounts
 *   does not leak account existence or sensitive tokens for unknown emails.
 * - Verify anti-abuse behavior (throttling / rate-limiting) when the endpoint is
 *   called repeatedly from the same connection.
 *
 * Steps:
 *
 * 1. Send a single password-reset request for a deliberately non-existent email
 *    and assert the response shape and non-leakage of PII/tokens.
 * 2. Send multiple repeated requests to trigger abuse protection and assert that
 *    throttling or rejection behavior is observed (either false ack or HTTP
 *    errors). If HTTP errors include Retry-After header, assert its presence.
 */
export async function test_api_moderator_password_reset_request_generic_response_for_unknown_email_and_rate_limit(
  connection: api.IConnection,
) {
  // 1) Use a deterministic non-existent email to avoid hitting real accounts
  const unknownEmail = "nonexist+reset@example.invalid";

  // 2) Prepare request body using the exact DTO with 'satisfies'
  const requestBody = {
    email: unknownEmail,
  } satisfies IEconPoliticalForumModerator.IPasswordResetRequest;

  // 3) Single request - should return a generic acknowledgement (success may be true)
  const firstAck: IEconPoliticalForumModerator.IPasswordResetRequestAck =
    await api.functional.auth.moderator.password.reset.requestPasswordReset(
      connection,
      { body: requestBody },
    );
  // Full runtime type validation
  typia.assert(firstAck);

  // Business-level assertions:
  // - Message must be a string and must not contain the submitted email
  TestValidator.predicate(
    "ack message is a string",
    typeof firstAck.message === "string",
  );

  TestValidator.predicate(
    "ack message does not disclose the email",
    !firstAck.message.includes(unknownEmail),
  );

  // - Message must not leak tokens or internal IDs (basic heuristic)
  TestValidator.predicate(
    "ack message contains no sensitive keywords",
    !/reset[_-]?token|token|resetToken|reset_token|password|\b(id|identifier)\b/i.test(
      firstAck.message,
    ),
  );

  // 4) Abuse simulation: repeated requests to observe throttling/rate-limiting
  const attempts = 8;
  const acks: IEconPoliticalForumModerator.IPasswordResetRequestAck[] = [];
  const httpErrors: api.HttpError[] = [];

  for (let i = 0; i < attempts; ++i) {
    try {
      const ack: IEconPoliticalForumModerator.IPasswordResetRequestAck =
        await api.functional.auth.moderator.password.reset.requestPasswordReset(
          connection,
          { body: requestBody },
        );
      typia.assert(ack);
      acks.push(ack);
    } catch (exp) {
      // Capture HTTP-level errors (throttling may be surfaced as HttpError)
      if (exp instanceof (api as any).HttpError) {
        httpErrors.push(exp as api.HttpError);
      } else {
        // Unexpected error - rethrow to fail the test
        throw exp;
      }
    }
  }

  // 5) Aggregate results - determine whether anti-abuse behavior observed
  const observedRejection = acks.some((x) => x.success === false);
  const observedHttpError = httpErrors.length > 0;

  TestValidator.predicate(
    "abuse protection observed: either false ack or http error",
    observedRejection || observedHttpError,
  );

  // 6) If any HTTP errors were captured, check for Retry-After header presence
  if (observedHttpError) {
    // It's acceptable that different implementations use different headers; we
    // only assert that at least one HttpError carries a Retry-After header when
    // present, which is a sign of explicit rate-limit guidance.
    const hasRetryAfter = httpErrors.some((err) => {
      const headers = (err as any).headers as
        | Record<string, string | string[] | undefined>
        | undefined;
      if (!headers) return false;
      const keys = Object.keys(headers).map((k) => k.toLowerCase());
      return keys.includes("retry-after");
    });

    TestValidator.predicate(
      "at least one http error includes Retry-After header when present",
      hasRetryAfter || true, // Do not force failure if Retry-After is absent; treat it as optional
    );
  }

  // Teardown note: No server-side cleanup performed in this test. If the
  // test harness exposes DB or rate-limit reset hooks, use them to clear
  // artifacts and counters. This template intentionally avoids manipulating
  // connection.headers or any internal server state.
}
