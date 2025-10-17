import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test seller payout detail retrieval by authenticated seller.
 *
 * This test validates that a seller can successfully register, authenticate,
 * and access the payout details endpoint. The workflow ensures proper
 * authentication flow and API endpoint accessibility.
 *
 * Steps:
 *
 * 1. Register a new seller account with complete business information
 * 2. System automatically authenticates and issues JWT tokens
 * 3. Attempt to retrieve payout details using the authenticated connection
 * 4. Validate the payout information structure is correct
 */
export async function test_api_seller_payout_detail_retrieval_by_authenticated_seller(
  connection: api.IConnection,
) {
  // Step 1: Register new seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: typia
      .random<
        number &
          tags.Type<"uint32"> &
          tags.Minimum<100000000> &
          tags.Maximum<999999999>
      >()
      .toString(),
  } satisfies IShoppingMallSeller.ICreate;

  // Step 2: Register and authenticate seller (automatically issues JWT tokens)
  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(authorizedSeller);

  // Validate seller registration response
  TestValidator.equals(
    "seller email matches",
    authorizedSeller.email,
    sellerData.email,
  );
  TestValidator.equals(
    "business name matches",
    authorizedSeller.business_name,
    sellerData.business_name,
  );
  TestValidator.predicate(
    "seller has valid ID",
    typeof authorizedSeller.id === "string" && authorizedSeller.id.length > 0,
  );
  TestValidator.predicate(
    "access token exists",
    typeof authorizedSeller.token.access === "string" &&
      authorizedSeller.token.access.length > 0,
  );

  // Step 3: Retrieve payout details using authenticated seller connection
  const payoutId = typia.random<string & tags.Format<"uuid">>();

  const payoutDetails =
    await api.functional.shoppingMall.seller.sellerPayouts.at(connection, {
      payoutId: payoutId,
    });
  typia.assert(payoutDetails);

  // Step 4: Validate payout details structure
  TestValidator.predicate(
    "payout has valid ID",
    typeof payoutDetails.id === "string" && payoutDetails.id.length > 0,
  );
  TestValidator.predicate(
    "net payout amount is numeric",
    typeof payoutDetails.net_payout_amount === "number",
  );
}
