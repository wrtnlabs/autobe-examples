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

/**
 * Test that email verification history supports pagination correctly.
 * 1. Customer joins the platform (creates initial email verification record)
 * 2. Retrieve verification history with pagination (page=1, limit=2)
 * 3. Verify pagination metadata structure and values
 * 4. Verify data array respects limit constraint
 * 5. Test page 2 navigation
 * 6. Verify records sorted by created_at DESC when multiple records exist
 */
export async function test_api_customer_email_verification_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer (creates initial email verification record)
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve verification history with pagination (page=1, limit=2)
  const page1 =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Verify pagination metadata structure
  TestValidator.equals("current page", page1.pagination.current, 1);
  TestValidator.equals("limit", page1.pagination.limit, 2);
  TestValidator.predicate(
    "records count non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    page1.pagination.pages >= 0,
  );
  // 4. Verify data array respects limit constraint
  TestValidator.predicate("data length within limit", page1.data.length <= 2);
  // 5. Verify at least one verification record exists from join
  TestValidator.predicate("has verification record", page1.data.length >= 1);
  // 6. Verify the verification record belongs to the customer
  TestValidator.equals(
    "verification belongs to customer",
    page1.data[0].customer.id,
    authorized.id,
  );
  // 7. Test page 2 navigation (may return empty if only 1 record)
  const page2 =
    await api.functional.shoppingMall.customer.email_verifications.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(page2);
  // 8. Verify page 2 pagination metadata
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
  // 9. Verify sorting (created_at DESC) when multiple records exist
  if (page1.data.length >= 2) {
    TestValidator.predicate(
      "sorted by created_at DESC",
      page1.data[0].created_at >= page1.data[1].created_at,
    );
  }
}
