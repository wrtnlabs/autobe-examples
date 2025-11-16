import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerVerification";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerification";

/**
 * Validate that an authenticated seller can list and filter their KYC and
 * compliance verification history.
 *
 * Steps:
 *
 * 1. Register a new seller and authenticate to obtain their UUID.
 * 2. Invoke the verification listing endpoint with various parameters (status,
 *    date ranges, etc.).
 * 3. Assert all returned verification records belong to the logged-in seller.
 * 4. Validate that pagination metadata is accurate and filters work as specified.
 * 5. Attempt to use another random seller ID and confirm access is denied.
 */
export async function test_api_seller_verification_history_listing_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a fresh seller for isolation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const registrationNumber = RandomGenerator.alphaNumeric(10);
  const businessPhone = RandomGenerator.mobile();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(2),
    registration_number: registrationNumber,
    business_phone: businessPhone,
    href: "https://test.example.com/dashboard", // Example URI as required
    referrer: "https://test.example.com/signup",
    ip: null,
  } satisfies IShoppingMallSeller.ICreate;

  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(authorizedSeller);
  const sellerId = authorizedSeller.id;

  // 2. List verifications with various filters and pagination
  const baseFilter: IShoppingMallSellerVerification.IRequest = {
    status: undefined,
    date_from: null,
    date_to: null,
    reviewer_admin_id: null,
    compliance_document_present: null,
    page: 1,
    limit: 10,
    sort_by: undefined,
    sort_order: undefined,
  };

  const verificationPage =
    await api.functional.shoppingMall.seller.sellers.verifications.index(
      connection,
      {
        sellerId: sellerId,
        body: baseFilter,
      },
    );
  typia.assert(verificationPage);
  for (const verif of verificationPage.data) {
    TestValidator.equals(
      "all verifications must belong to logged-in seller",
      verif.seller.id,
      sellerId,
    );
  }
  // verify that the page metadata is correct
  TestValidator.equals(
    "pagination current page matches request",
    verificationPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records per page less than or equal to limit",
    verificationPage.data.length <= 10,
  );

  // 3. Try more advanced filter: filter by status
  const statusFilter: IShoppingMallSellerVerification.IRequest = {
    ...baseFilter,
    status:
      verificationPage.data.length > 0
        ? verificationPage.data[0].status
        : undefined,
  };
  const filteredPage =
    await api.functional.shoppingMall.seller.sellers.verifications.index(
      connection,
      {
        sellerId: sellerId,
        body: statusFilter,
      },
    );
  typia.assert(filteredPage);
  for (const verif of filteredPage.data) {
    TestValidator.equals(
      "filtered verification must belong to seller",
      verif.seller.id,
      sellerId,
    );
    if (statusFilter.status) {
      TestValidator.equals(
        "verification status matches filter",
        verif.status,
        statusFilter.status,
      );
    }
  }

  // 4. Attempt to access another seller's verifications and expect denial
  const maliciousSellerId = typia.random<string & tags.Format<"uuid">>();
  if (maliciousSellerId !== sellerId) {
    await TestValidator.error(
      "should deny listing another seller's verification history",
      async () => {
        await api.functional.shoppingMall.seller.sellers.verifications.index(
          connection,
          {
            sellerId: maliciousSellerId,
            body: baseFilter,
          },
        );
      },
    );
  }
}
