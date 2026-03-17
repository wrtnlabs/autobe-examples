import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * @scenario Customer queries for eligible order items for refund but has no eligible items
 * Returns empty paginated result with proper metadata structure
 * @author AutoBE
 */
export async function test_api_customer_order_items_eligible_for_refund_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Authentication required - anonymous access should fail with 401
  await TestValidator.httpError(
    "unauthenticated access should return 401",
    401,
    async () => {
      await api.functional.ecommerceMall.customer.orderItems.eligibleForRefund.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            sort: "created_at",
            order: "desc",
          } satisfies IEcommerceMallOrderItem.IEligibleForRefundRequest,
        },
      );
    },
  );
  // Test 2: Create authenticated customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // Test 3: Query eligible items for customer with no orders - should return empty result
  const emptyResult =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForRefund.index(
      customerConnection,
      {
        body: {
          orderId: null,
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallOrderItem.IEligibleForRefundRequest,
      },
    );
  typia.assert(emptyResult);
  // Test 4: Validate empty pagination structure
  TestValidator.equals(
    "pagination current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", emptyResult.pagination.limit, 10);
  TestValidator.equals("pagination records", emptyResult.pagination.records, 0);
  TestValidator.equals("pagination pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("data array is empty", emptyResult.data.length, 0);
  // Test 5: Query with non-existent orderId filter - should return empty result
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  const filteredResult =
    await api.functional.ecommerceMall.customer.orderItems.eligibleForRefund.index(
      customerConnection,
      {
        body: {
          orderId: nonExistentOrderId,
          page: 1,
          limit: 20,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallOrderItem.IEligibleForRefundRequest,
      },
    );
  typia.assert(filteredResult);
  // Test 6: Validate filtered result pagination
  TestValidator.equals(
    "filtered pagination current page",
    filteredResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered pagination limit",
    filteredResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "filtered pagination records",
    filteredResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "filtered pagination pages",
    filteredResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "filtered data array is empty",
    filteredResult.data.length,
    0,
  );
}
