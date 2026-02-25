import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerEmailVerification";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_email_verifications_index_success_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Overview: Test email verification pagination and filtering for customer.
  // 1. Arrange: Create an authorized customer by joining.
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(authorizedCustomer);
  // Setup authorized customer connection headers
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Prepare filter criteria
  // We generate some random token substring from a sample token string
  const sampleToken = typia.random<string & tags.Format<"uuid">>();
  const tokenSubstring = sampleToken.substring(0, 8);
  // Using now date and shifted ranges for filtering by expiresAtBefore and expiresAtAfter
  const now = new Date();
  const expiresAtAfter = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1 hour ago
  const expiresAtBefore = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString(); // 1 hour later
  const verified = false; // We choose filtering for unverified tokens as example
  // Since the test is for the customer's own email verifications, filter by customer ID
  const shoppingMallCustomerId = authorizedCustomer.id;
  // Pagination parameters
  const page = 1;
  const limit = 10;
  // 3. Act: Call the index endpoint with filters and pagination
  const body: IShoppingMallCustomerEmailVerification.IRequest = {
    token: tokenSubstring,
    expiresAtBefore,
    expiresAtAfter,
    verified,
    shoppingMallCustomerId,
    page,
    limit,
  };
  const response =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      {
        body,
      },
    );
  // 4. Assert: Validate response structure and content
  typia.assert(response);
  const { pagination, data } = response;
  // Assert pagination properties
  TestValidator.predicate(
    "pagination current page positive",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination total records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  // Assert data array length
  TestValidator.predicate(
    "pagination data length within limit",
    data.length <= limit,
  );
  // Assert each data item
  for (const item of data) {
    typia.assert(item);
    // Check that the token field contains the token substring if token filter exists
    if (body.token) {
      TestValidator.predicate(
        `token substring filter match: ${body.token}`,
        item.token.includes(body.token),
      );
    }
    // Check expiration date within range
    if (body.expiresAtAfter !== null && body.expiresAtAfter !== undefined) {
      TestValidator.predicate(
        "expiresAt >= expiresAtAfter",
        item.expiresAt >= body.expiresAtAfter!,
      );
    }
    if (body.expiresAtBefore !== null && body.expiresAtBefore !== undefined) {
      TestValidator.predicate(
        "expiresAt <= expiresAtBefore",
        item.expiresAt <= body.expiresAtBefore!,
      );
    }
    // Verified status check
    if (body.verified === true) {
      TestValidator.predicate(
        "verifiedAt is not null",
        item.verifiedAt !== null,
      );
    } else if (body.verified === false) {
      TestValidator.predicate("verifiedAt is null", item.verifiedAt === null);
    }
    // Customer ID check
    TestValidator.equals(
      "customer ID match",
      item.customer.id,
      body.shoppingMallCustomerId,
    );
  }
  // Assert sorting by expiresAt ascending
  for (let i = 1; i < data.length; i++) {
    TestValidator.predicate(
      `data sorted by expiresAt ascending: ${i}`,
      data[i].expiresAt >= data[i - 1].expiresAt,
    );
  }
}
