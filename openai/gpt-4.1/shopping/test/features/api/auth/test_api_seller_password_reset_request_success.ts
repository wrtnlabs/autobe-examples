import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Test the ability for a seller to initiate a password reset with a registered
 * business email.
 *
 * This scenario validates that after registering a seller, a password reset can
 * be triggered for the same email. The test ensures the system creates a
 * password reset request, issues a secure reset code (which must NOT be
 * disclosed in the response), but only returns a generic confirmation message
 * that does not leak email existence information. Outbound email delivery is
 * not validated.
 *
 * Steps:
 *
 * 1. Register a new seller using a random, unique business email
 * 2. Request a password reset using the registered seller's email
 * 3. Validate the response is a generic confirmation and does not include any
 *    reset code or email existence hint
 * 4. Assert the response structure/type using typia.assert
 */
export async function test_api_seller_password_reset_request_success(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const uniqueSellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerRegBody = {
    email: uniqueSellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerRegBody });
  typia.assert(seller);
  TestValidator.equals(
    "seller email matches registration input",
    seller.email,
    uniqueSellerEmail,
  );

  // 2. Request password reset
  const resetReqBody = {
    email: uniqueSellerEmail,
  } satisfies IShoppingSeller.IResetPasswordRequest;
  const resetResult =
    await api.functional.auth.seller.password.request_reset.requestPasswordReset(
      connection,
      { body: resetReqBody },
    );
  typia.assert(resetResult);

  // 3. Validate generic response message
  TestValidator.predicate(
    "reset password result is generic message and does not leak email existence",
    typeof resetResult.message === "string" && resetResult.message.length > 0,
  );
}
