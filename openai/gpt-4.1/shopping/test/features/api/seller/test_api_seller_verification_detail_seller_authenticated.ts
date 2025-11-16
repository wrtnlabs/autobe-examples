import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerification";

/**
 * Validate that an authenticated seller can retrieve their own business
 * verification record by ID.
 *
 * This test ensures the following business logic and compliance requirements:
 *
 * 1. Seller registration and authentication flow: Register a new seller using
 *    random, unique registration data and perform authorization. This
 *    guarantees proper token issuance and session context.
 * 2. Pre-populate a business verification record for the seller using a random ID
 *    and known link to the seller created above. (Simulation/mock recommended
 *    if direct creation is not permitted, otherwise skip direct DB insertion
 *    but use random ID for boundary test.)
 * 3. Use seller token and credentials to attempt a GET request to
 *    /shoppingMall/seller/sellers/{sellerId}/verifications/{verificationId} for
 *    the created verification record.
 * 4. Validate that the response structure matches IShoppingMallSellerVerification
 *    and passes typia.assert.
 * 5. Check all entity relations are correctly resolved: seller summary must match
 *    created seller, reviewer/admin summary may be null or valid admin
 *    structure, status value is string, timestamps are valid ISO strings.
 * 6. Assert proper access control: Seller can only access their own verification.
 *    Attempt to access a non-associated verificationId or use a random,
 *    non-existent sellerId should result in error.
 * 7. Error scenarios: Validate error via TestValidator.error when providing
 *    mismatched sellerId/verificationId or non-existent IDs.
 */
export async function test_api_seller_verification_detail_seller_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a new seller with random, unique data and authenticate.
  const sellerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://shoppingmall.test/seller-onboard",
    referrer: "https://google.com",
    ip: undefined, // Optional, may be omitted
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerBody,
  });
  typia.assert(sellerAuth);
  // Seller summary for comparison
  const { id: sellerId } = sellerAuth;
  const sellerSummary = sellerAuth.seller;

  // 2. Pre-simulate a verification record for this seller since no POST create-API exists (simulate with known ID)
  // In real staging, this would require a creation endpoint or DB setup. Simulate a known uuid for verificationId.
  // We'll use the simulation mode to retrieve random data as if we created a record for this seller.
  const verificationId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve the verification record as the authenticated seller.
  const verification =
    await api.functional.shoppingMall.seller.sellers.verifications.at(
      connection,
      {
        sellerId,
        verificationId,
      },
    );
  typia.assert(verification);

  // 4. Validate that the returned seller matches the authenticated seller.
  if (sellerSummary) {
    TestValidator.equals(
      "verification.seller matches original",
      verification.seller,
      sellerSummary,
    );
  } else {
    // fallback: check that verification.seller.id equals sellerId and business_name is the same
    TestValidator.equals(
      "verification.seller.id matches auth",
      verification.seller.id,
      sellerId,
    );
    TestValidator.equals(
      "verification.seller.business_name matches",
      verification.seller.business_name,
      sellerBody.business_name,
    );
  }

  // 5. Validate reviewer_admin is either null/undefined or a valid IShoppingMallAdmin.ISummary
  if (
    verification.reviewer_admin !== null &&
    verification.reviewer_admin !== undefined
  ) {
    typia.assert<IShoppingMallAdmin.ISummary>(verification.reviewer_admin);
  }
  // 6. Validate status is a string, created_at is ISO, etc.
  TestValidator.predicate(
    "status is string",
    typeof verification.status === "string",
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof verification.created_at === "string" &&
      !isNaN(Date.parse(verification.created_at)),
  );

  // 7. Error: Try retrieving a verification with random, non-existent sellerId
  const otherSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("error for non-existent sellerId", async () => {
    await api.functional.shoppingMall.seller.sellers.verifications.at(
      connection,
      {
        sellerId: otherSellerId,
        verificationId,
      },
    );
  });

  // 8. Error: Try retrieving a verification with random, non-existent verificationId
  const otherVerificationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "error for non-existent verificationId",
    async () => {
      await api.functional.shoppingMall.seller.sellers.verifications.at(
        connection,
        {
          sellerId,
          verificationId: otherVerificationId,
        },
      );
    },
  );
}
