import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerInquiry";

export async function test_api_customer_inquiry_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer to authenticate
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "ValidPassword123!",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com/",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a new customer inquiry
  const inquiryCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallCustomerInquiry.ICreate;

  const inquiry: IShoppingMallCustomerInquiry =
    await api.functional.shoppingMall.customer.customerInquiries.create(
      connection,
      {
        body: inquiryCreateBody,
      },
    );
  typia.assert(inquiry);

  // 3. Retrieve the inquiry by its id
  const inquiryRetrieved: IShoppingMallCustomerInquiry =
    await api.functional.shoppingMall.customer.customerInquiries.at(
      connection,
      {
        id: inquiry.id,
      },
    );
  typia.assert(inquiryRetrieved);

  // 4. Validate returned inquiry matches created inquiry
  TestValidator.equals("inquiry id matches", inquiryRetrieved.id, inquiry.id);
  TestValidator.equals(
    "inquiry title matches",
    inquiryRetrieved.title,
    inquiry.title,
  );
  TestValidator.equals(
    "inquiry body matches",
    inquiryRetrieved.body,
    inquiry.body,
  );
  TestValidator.equals(
    "inquiry status matches",
    inquiryRetrieved.status,
    inquiry.status,
  );
  TestValidator.equals(
    "inquiry customer_id matches",
    inquiryRetrieved.customer_id,
    inquiry.customer_id,
  );
  TestValidator.equals(
    "inquiry created_at matches",
    inquiryRetrieved.created_at,
    inquiry.created_at,
  );
  TestValidator.equals(
    "inquiry updated_at matches",
    inquiryRetrieved.updated_at,
    inquiry.updated_at,
  );
}
