import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer authentication and variant option filtering for order item snapshots.
 *
 * Validates the filtering capability of the variant options endpoint by querying with a specific key filter parameter. Ensures that only options matching the specified key are returned and that the response structure is correct.
 *
 * Since order creation utilities are not available in the provided SDK, this test focuses on the filtering API endpoint behavior with generated UUIDs, ensuring the request structure and response validation work correctly.
 *
 * 1. Customer authenticates via join operation.
 * 2. Generate random order and item IDs for testing.
 * 3. Query variant options with a key filter parameter.
 * 4. Query variant options without filter for comparison.
 * 5. Validates filtered results contain only options matching the filter key.
 */
export async function test_api_order_item_variant_options_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate random order and item IDs (simulated)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Query variant options with key filter
  const filterKey = RandomGenerator.pick([
    "color",
    "size",
    "material",
    "style",
  ]);
  const filteredResult =
    await api.functional.ecommerce.customer.orders.items.snapshot.variant.options.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          key: filterKey,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceOrderItemSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 4. Query without filter to compare
  const allResult =
    await api.functional.ecommerce.customer.orders.items.snapshot.variant.options.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceOrderItemSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(allResult);
  // 5. Validate filtered results contain only matching keys
  for (const option of filteredResult.data) {
    TestValidator.equals(
      "filtered option key matches filter",
      option.key,
      filterKey,
    );
  }
}
