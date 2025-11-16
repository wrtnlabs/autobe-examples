import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";

/**
 * Validate seller password reset request behavior under repeated and
 * multi-client usage.
 *
 * Business goals (rewritten to be externally observable only):
 *
 * - The password reset request endpoint must always return a generic response
 *   that does not disclose whether a seller account exists for a given email.
 * - Repeated requests for the same email must not leak rate limiting or
 *   account-existence information through HTTP errors or specialized messages.
 * - Requests coming from different simulated clients should continue to receive
 *   the same generic response structure.
 *
 * Steps implemented in this test:
 *
 * 1. Generate one syntactically valid seller email address (existing vs.
 *    non-existing is intentionally unknown at this layer) using typia's email
 *    format.
 * 2. Perform a baseline password reset request for that email and assert that the
 *    response conforms to IResponse and has a non-empty message.
 * 3. Rapidly repeat several reset requests for the same email using the same
 *    connection. Assert that all responses:
 *
 *    - Successfully conform to IResponse via typia.assert.
 *    - Do not throw HTTP errors (we only see successful responses).
 *    - Contain non-empty message strings.
 * 4. Create a cloned connection object representing another client (without
 *    mutating headers) and repeat multiple requests for the same email, again
 *    validating that responses remain generic and type-correct.
 * 5. Generate a second random, syntactically valid email and send a single reset
 *    request for it; assert that this response is also of type IResponse with a
 *    non-empty, generic message.
 *
 * This test does not attempt to verify internal token consolidation, DB
 * updates, or security event logging, as those concerns are not observable from
 * the SDK surface. Instead, it focuses on type safety, absence of overt
 * rate-limit error signaling, and consistent generic messaging across repeated
 * and multi-client usage for both known-unknown and likely-nonexistent emails.
 */
export async function test_api_seller_password_reset_request_rate_limiting_and_abuse_signals(
  connection: api.IConnection,
) {
  // 1. Generate a syntactically valid seller email
  const primaryEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // Helper closure to send a single password reset request and assert
  const sendResetRequest = async (
    conn: api.IConnection,
    email: string & tags.Format<"email">,
  ): Promise<IShoppingMallSellerPasswordResetRequest.IResponse> => {
    const response =
      await api.functional.auth.seller.password.reset.request.requestPasswordReset(
        conn,
        {
          body: {
            email,
          } satisfies IShoppingMallSellerPasswordResetRequest.IRequest,
        },
      );
    typia.assert(response);

    // Ensure message is a non-empty string and success is boolean (already
    // type-validated by typia, but we assert basic business expectations).
    TestValidator.predicate(
      "password reset response message should be non-empty",
      response.message.length > 0,
    );

    return response;
  };

  // 2. Baseline request on the primary connection
  const baselineResponse = await sendResetRequest(connection, primaryEmail);
  TestValidator.predicate(
    "baseline password reset success flag is boolean (true/false)",
    typeof baselineResponse.success === "boolean",
  );

  // 3. Rapid repeated requests on the same connection for the same email
  const repeatCount = 5;
  const repeatedResponses = await ArrayUtil.asyncRepeat(
    repeatCount,
    async (index) => {
      const response = await sendResetRequest(connection, primaryEmail);
      TestValidator.predicate(
        `repeated request #${index + 1} returns generic response structure`,
        typeof response.success === "boolean" && response.message.length > 0,
      );
      return response;
    },
  );

  // Sanity check: all repeated responses are structurally equal to the baseline
  // response shape-wise, though message content may vary. We only check that
  // the set of keys is the same and types remain consistent, not exact
  // equality of values.
  const baselineKeys = Object.keys(baselineResponse).sort();
  for (let i = 0; i < repeatedResponses.length; i++) {
    const keys = Object.keys(repeatedResponses[i]).sort();
    TestValidator.equals(
      `repeated response #${i + 1} should expose same keys as baseline`,
      keys,
      baselineKeys,
    );
  }

  // 4. Simulate a second client by shallow cloning the connection object.
  // We must not manually touch or manipulate headers beyond the spread copy.
  const secondaryConnection: api.IConnection = {
    ...connection,
  };

  const secondaryResponses = await ArrayUtil.asyncRepeat(
    repeatCount,
    async (index) => {
      const response = await sendResetRequest(
        secondaryConnection,
        primaryEmail,
      );
      TestValidator.predicate(
        `secondary client request #${index + 1} returns generic response structure`,
        typeof response.success === "boolean" && response.message.length > 0,
      );
      return response;
    },
  );

  // Check that secondary responses also have the same key-set as baseline
  for (let i = 0; i < secondaryResponses.length; i++) {
    const keys = Object.keys(secondaryResponses[i]).sort();
    TestValidator.equals(
      `secondary response #${i + 1} should expose same keys as baseline`,
      keys,
      baselineKeys,
    );
  }

  // 5. Use a second random valid email (likely non-existent) and confirm the
  // outward response remains generic.
  const otherEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const otherResponse = await sendResetRequest(connection, otherEmail);
  TestValidator.predicate(
    "other email password reset response message should be non-empty",
    otherResponse.message.length > 0,
  );

  // Verify that the key-set for the otherEmail response matches baseline as
  // well, keeping the outward schema consistent regardless of account
  // existence.
  const otherKeys = Object.keys(otherResponse).sort();
  TestValidator.equals(
    "other email response should expose same keys as baseline",
    otherKeys,
    baselineKeys,
  );
}
