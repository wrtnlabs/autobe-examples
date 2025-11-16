import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";

/**
 * Validate the happy-path seller password reset request workflow.
 *
 * Business intent:
 *
 * - When a seller initiates a password reset using their login email, the system
 *   must accept the request, create (internally) a password reset token, and
 *   respond with a generic acknowledgement that does not reveal whether the
 *   email is actually registered.
 * - The test can only validate the public API contract, not internal DB state or
 *   audit logs, because no admin or DB inspection APIs are available in this
 *   context.
 *
 * What this test verifies:
 *
 * 1. The endpoint POST /auth/seller/password/reset/request accepts a syntactically
 *    valid email request body.
 * 2. The response conforms to IShoppingMallSellerPasswordResetRequest.IResponse
 *    and passes typia.assert.
 * 3. The response indicates success via `success === true`.
 * 4. The response `message` is a non-empty, generic human-readable string that
 *    does _not_ leak account existence (e.g., should not contain obvious
 *    phrases such as "does not exist", "not found", or "no account").
 * 5. Repeating the same request with the same email produces the same kind of
 *    generic, non-disclosing acknowledgement (surface idempotency).
 */
export async function test_api_seller_password_reset_request_for_existing_email(
  connection: api.IConnection,
) {
  // 1. Generate a syntactically valid seller email.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 2. First password reset request.
  const firstResponse: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email,
        } satisfies IShoppingMallSellerPasswordResetRequest.IRequest,
      },
    );

  // Type-level guarantee of the response structure.
  typia.assert<IShoppingMallSellerPasswordResetRequest.IResponse>(
    firstResponse,
  );

  // 3. Business-level assertions for first response.
  TestValidator.predicate(
    "first response should indicate success",
    firstResponse.success === true,
  );

  TestValidator.predicate(
    "first response message should be a non-empty string",
    firstResponse.message.length > 0,
  );

  const lowerFirstMessage: string = firstResponse.message.toLowerCase();
  TestValidator.predicate(
    "first response message must not disclose account existence",
    !lowerFirstMessage.includes("does not exist") &&
      !lowerFirstMessage.includes("not found") &&
      !lowerFirstMessage.includes("no account"),
  );

  // 4. Second (repeat) password reset request with the same email to
  //    validate surface idempotency and consistent generic messaging.
  const secondResponse: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email,
        } satisfies IShoppingMallSellerPasswordResetRequest.IRequest,
      },
    );

  typia.assert<IShoppingMallSellerPasswordResetRequest.IResponse>(
    secondResponse,
  );

  TestValidator.predicate(
    "second response should indicate success",
    secondResponse.success === true,
  );

  TestValidator.predicate(
    "second response message should be a non-empty string",
    secondResponse.message.length > 0,
  );

  const lowerSecondMessage: string = secondResponse.message.toLowerCase();
  TestValidator.predicate(
    "second response message must not disclose account existence",
    !lowerSecondMessage.includes("does not exist") &&
      !lowerSecondMessage.includes("not found") &&
      !lowerSecondMessage.includes("no account"),
  );

  // Optional consistency check: messages should both be generic and
  // non-disclosing. They may be equal or different depending on the
  // implementation, so we only ensure both satisfy the non-disclosure
  // constraints above. If you want, you could add a soft equality check
  // here, but it's not strictly required by the business rules.
}
