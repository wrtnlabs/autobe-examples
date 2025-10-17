import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registereduser_password_request_reset_rate_limit(
  connection: api.IConnection,
) {
  /**
   * E2E test: password reset request rate-limit and anti-abuse behavior.
   *
   * Flow:
   *
   * 1. Generate a realistic test email
   * 2. Send an initial request and assert a generic success response
   * 3. Send a burst of repeated requests for the same email and collect
   *    successes/errors
   * 4. Assert: at least one success, no 5xx server errors, and evidence of
   *    client-side throttling (at least one 4xx) unless running in simulation
   *    mode where rate-limits are not enforced.
   */

  // 1) Prepare test email (RFC-compatible)
  const testEmail: string = typia.random<string & tags.Format<"email">>();

  const buildBody = () =>
    ({
      email: testEmail,
    }) satisfies IEconPoliticalForumRegisteredUser.IRequestPasswordReset;

  // 2) Initial single request
  const initial: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.password.request_reset.requestPasswordReset(
      connection,
      { body: buildBody() },
    );
  typia.assert(initial);
  // typia.assert already validates structure; add a lightweight predicate
  TestValidator.predicate(
    "initial response contains boolean success flag",
    typeof initial.success === "boolean",
  );

  // 3) Burst of repeated requests
  const BURST_COUNT = 10;
  const successes: IEconPoliticalForumRegisteredUser.IGenericSuccess[] = [];
  const errors: unknown[] = [];

  await ArrayUtil.asyncRepeat(BURST_COUNT, async () => {
    try {
      const out: IEconPoliticalForumRegisteredUser.IGenericSuccess =
        await api.functional.auth.registeredUser.password.request_reset.requestPasswordReset(
          connection,
          { body: buildBody() },
        );
      typia.assert(out);
      successes.push(out);
    } catch (exp) {
      errors.push(exp);
    }
  });

  // 4) Business assertions
  TestValidator.predicate(
    "at least one burst request succeeded",
    successes.length > 0,
  );

  // Robust runtime classification for errors without relying on SDK class availability
  const isHttpLike = (e: unknown): e is { status?: number } => {
    return (
      typeof e === "object" &&
      e !== null &&
      typeof (e as any).status === "number"
    );
  };

  const hasServerError = errors.some(
    (e) => isHttpLike(e) && (e as any).status >= 500,
  );
  TestValidator.predicate("no 5xx responses during burst", !hasServerError);

  const clientErrorCount = errors.filter(
    (e) => isHttpLike(e) && (e as any).status >= 400 && (e as any).status < 500,
  ).length;

  // If running in simulation mode, rate-limits may not be enforced; skip strict check then
  if (connection.simulate === true) {
    TestValidator.predicate(
      "simulation mode: skipped strict rate-limit enforcement check",
      true,
    );
  } else {
    TestValidator.predicate(
      "observed at least one client-side error (4xx) indicating throttling or rate-limit",
      clientErrorCount > 0,
    );
  }

  // 5) Final extra request to check stability: either generic success or a client error (no server error)
  try {
    const extra =
      await api.functional.auth.registeredUser.password.request_reset.requestPasswordReset(
        connection,
        { body: buildBody() },
      );
    typia.assert(extra);
    TestValidator.predicate(
      "extra request returned generic success or acknowledgement",
      typeof extra.success === "boolean",
    );
  } catch (exp) {
    if (isHttpLike(exp)) {
      // Ensure it's not a server error
      TestValidator.predicate(
        "extra request produced client error not server error",
        (exp as any).status < 500,
      );
    } else {
      // Unexpected non-HTTP error should fail the test
      throw exp;
    }
  }

  // Teardown note: The test environment should clear password-reset records and reset mailer counters if accessible.
}
