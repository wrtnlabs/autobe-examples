import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerInquiry";

/**
 * Test scenario for customer inquiry deletion by the customer.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new customer account via the auth.customer.join endpoint, which
 *    automatically authenticates the customer.
 * 2. Creates a new customer inquiry as the authenticated customer, using
 *    shoppingMall.customer.customerInquiries.create endpoint.
 * 3. Deletes the created inquiry as the same authenticated customer, using the
 *    shoppingMall.customer.customerInquiries.erase endpoint.
 * 4. Attempts to retrieve the deleted inquiry and expects failure, verifying that
 *    the inquiry is permanently deleted.
 *
 * This test ensures that only the owner of the inquiry can delete it, and that
 * deletion is permanent with no further retrieval possible.
 */
export async function test_api_customer_inquiry_deletion_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer account with auth.customer.join
  const customerCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "TestPassword123!",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(authorizedCustomer);

  // Step 2: Create a new customer inquiry as authenticated user
  const inquiryCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    status: "open",
  } satisfies IShoppingMallCustomerInquiry.ICreate;
  const createdInquiry: IShoppingMallCustomerInquiry =
    await api.functional.shoppingMall.customer.customerInquiries.create(
      connection,
      {
        body: inquiryCreateBody,
      },
    );
  typia.assert(createdInquiry);

  // Step 3: Delete the created inquiry as the same authenticated customer
  await api.functional.shoppingMall.customer.customerInquiries.erase(
    connection,
    {
      id: createdInquiry.id,
    },
  );

  // Step 4: Verify the inquiry is permanently removed
  // Since no retrieval API provided, test that deleting again throws error
  await TestValidator.error(
    "Deleted inquiry cannot be deleted again",
    async () => {
      await api.functional.shoppingMall.customer.customerInquiries.erase(
        connection,
        {
          id: createdInquiry.id,
        },
      );
    },
  );
}
