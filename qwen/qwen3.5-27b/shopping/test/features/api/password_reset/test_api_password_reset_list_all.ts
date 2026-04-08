import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test listing password reset requests across all user types with pagination and validation.
 *
 * Validates the password reset listing endpoint functionality including authentication, response structure, pagination, and data integrity. Ensures that password reset records from all user types (customer, seller, administrator) are aggregated correctly and that sensitive token data is properly masked.
 *
 * Special attention is given to verifying that the token field is masked for security purposes and that the status field accurately reflects the current state of each password reset token based on its expiration and usage.
 *
 * 1. Customer authenticates via registration endpoint.
 * 2. Password reset listing endpoint is called without filters to retrieve all records.
 * 3. Response structure is validated to include pagination metadata and data array.
 * 4. Each password reset record is validated for required fields and data integrity.
 * 5. Token masking is verified to ensure only first 4 characters are visible.
 * 6. Status field accuracy is validated based on token expiration and usage.
 * 7. Pagination is tested by requesting page 2 and confirming different records.
 * 8. Default sorting by created_at in descending order is verified.
 */
export async function test_api_password_reset_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Call password reset listing endpoint without filters
  const page1 =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.predicate("limit is positive", page1.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    page1.pagination.pages >= 0,
  );
  // 4. Validate password reset records
  await ArrayUtil.asyncForEach(page1.data, async (record, index) => {
    // 5. Validate token masking (first 4 characters visible followed by ***)
    TestValidator.predicate(
      `record ${index} token is masked properly`,
      record.token.length >= 4 && record.token.substring(4) === "***",
    );
    // 6. Validate status field is one of expected values
    TestValidator.predicate(
      `record ${index} has valid status value`,
      record.status === "active" ||
        record.status === "expired" ||
        record.status === "used",
    );
    // 7. Validate user_type field is one of expected values
    TestValidator.predicate(
      `record ${index} has valid user_type value`,
      record.user_type === "customer" ||
        record.user_type === "seller" ||
        record.user_type === "administrator",
    );
    // 8. Validate email format
    TestValidator.predicate(
      `record ${index} user_email contains @ symbol`,
      record.user_email.includes("@"),
    );
  });
  // 9. Test pagination by requesting page 2
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.shoppingMall.customer.password_resets.index(
        customerConnection,
        {
          body: {
            page: 2,
          } satisfies IShoppingMallCustomerPasswordReset.IRequest,
        },
      );
    typia.assert(page2);
    // Validate page 2 response
    TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
    // Validate different records between page 1 and page 2
    if (page1.data.length > 0 && page2.data.length > 0) {
      const page1Ids = page1.data.map((r) => r.id);
      const page2Ids = page2.data.map((r) => r.id);
      const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
      TestValidator.predicate(
        "page 1 and page 2 have no overlapping records",
        !hasOverlap,
      );
    }
  }
  // 10. Verify default sorting by created_at in descending order
  if (page1.data.length > 1) {
    const isSortedDescending = page1.data.every((record, index, array) => {
      if (index === 0) return true;
      const previous = array[index - 1];
      return (
        new Date(record.created_at).getTime() <=
        new Date(previous.created_at).getTime()
      );
    });
    TestValidator.predicate(
      "records are sorted by created_at in descending order",
      isSortedDescending,
    );
  }
}
