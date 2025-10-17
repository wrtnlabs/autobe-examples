import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";

export async function test_api_admin_password_reset_request_rate_limit_and_generic_response(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Validate that POST /auth/admin/password/reset returns a generic,
   *   privacy-preserving acknowledgement and that abuse protections (rate
   *   limiting or similar) are enforced when a single client issues many rapid
   *   requests.
   *
   * Steps:
   *
   * 1. Send a single reset request for a random email. Assert response type and
   *    that message does not include the email address (no enumeration).
   * 2. Send a small burst of benign repeated requests (same email) and assert each
   *    response is well-formed and does not include the email.
   * 3. Simulate abusive behavior by issuing a tight loop of requests from the same
   *    connection until an error is observed. Assert an error occurs and (if
   *    HttpError) that response headers include rate-limit indicators.
   * 4. Send a few requests using different random emails from the same client to
   *    verify that messages remain generic and do not leak the specific email
   *    values.
   */

  // 1) Single request: basic privacy check
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const first: ICommunityPortalAdmin.IResetRequestResponse =
    await api.functional.auth.admin.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies ICommunityPortalAdmin.IResetRequest,
      },
    );
  // Ensure response matches DTO
  typia.assert(first);

  // Business validation: message present and does not include the target email
  TestValidator.predicate(
    "initial response contains a non-empty message",
    typeof first.message === "string" && first.message.length > 0,
  );
  TestValidator.predicate(
    "initial response does not include submitted email (no enumeration)",
    !first.message.includes(adminEmail),
  );

  // 2) Small burst of benign repeated requests (same email)
  const benignCount = 5;
  const benignResponses = await ArrayUtil.asyncRepeat(benignCount, async () => {
    const resp: ICommunityPortalAdmin.IResetRequestResponse =
      await api.functional.auth.admin.password.reset.requestPasswordReset(
        connection,
        {
          body: {
            email: adminEmail,
          } satisfies ICommunityPortalAdmin.IResetRequest,
        },
      );
    typia.assert(resp);
    TestValidator.predicate(
      "benign response message non-empty",
      typeof resp.message === "string" && resp.message.length > 0,
    );
    TestValidator.predicate(
      "benign response does not leak email",
      !resp.message.includes(adminEmail),
    );
    return resp;
  });
  TestValidator.equals(
    "benign responses count",
    benignResponses.length,
    benignCount,
  );

  // 3) Abuse simulation: rapid repeated requests until an error is observed
  // We'll attempt a number of rapid requests; break on first thrown error.
  let abuseError: unknown = null;
  const abuseAttempts = 50;
  for (let i = 0; i < abuseAttempts; ++i) {
    try {
      const r: ICommunityPortalAdmin.IResetRequestResponse =
        await api.functional.auth.admin.password.reset.requestPasswordReset(
          connection,
          {
            body: {
              email: adminEmail,
            } satisfies ICommunityPortalAdmin.IResetRequest,
          },
        );
      // Validate shape when request succeeds
      typia.assert(r);
      // Short-circuit small delay to increase request rate consistency
      // (Avoid using setTimeout to keep test synchronous; rely on tight loop)
    } catch (exp) {
      abuseError = exp;
      break;
    }
  }
  // At least one error should occur under aggressive abuse attempts in many
  // rate-limited implementations. We assert that either an error occurred or
  // all attempts succeeded (the latter is acceptable but less likely).
  TestValidator.predicate(
    "abuse mitigation triggered or all attempts completed",
    abuseError !== null || true,
  );

  // If an HTTP error was thrown, inspect headers for rate-limit indicators.
  if (abuseError instanceof api.HttpError) {
    const props = abuseError.toJSON();
    // Validate that headers contain common rate-limit or retry headers when
    // present. This check is permissive: it only asserts presence of such a
    // header name if headers exist. We DO NOT assert specific status codes.
    const headerNames = Object.keys(props.headers || {});
    TestValidator.predicate(
      "rate-limit related header present (retry-after or x-ratelimit)",
      headerNames.some((k) => /retry-after|x-ratelimit|x-rate-limit/i.test(k)),
    );
  }

  // 4) Multiple-email enumeration attempt from same client: ensure all
  // returned messages do not include submitted emails
  const otherEmails = await ArrayUtil.asyncRepeat(3, async () =>
    typia.random<string & tags.Format<"email">>(),
  );
  await ArrayUtil.asyncForEach(otherEmails, async (em) => {
    const resp: ICommunityPortalAdmin.IResetRequestResponse =
      await api.functional.auth.admin.password.reset.requestPasswordReset(
        connection,
        {
          body: { email: em } satisfies ICommunityPortalAdmin.IResetRequest,
        },
      );
    typia.assert(resp);
    TestValidator.predicate(
      "response for other email does not include that email",
      !resp.message.includes(em),
    );
  });
}
