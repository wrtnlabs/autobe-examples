import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller retrieves pending shipments paginated list.
 * 1. Register seller account
 * 2. Query pending shipments endpoint with pagination
 * 3. Validate response structure and pagination metadata
 * 4. Verify only paid status items are returned
 */
export async function test_api_seller_pending_shipments_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Query pending shipments with pagination
  const result =
    await api.functional.ecommerceMall.seller.order_items.pending_shipments.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "paid",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate response structure
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 5. If data exists, validate order item structure
  if (result.data.length > 0) {
    const firstItem = result.data[0];
    TestValidator.predicate(
      "has order",
      firstItem.order !== null && firstItem.order !== undefined,
    );
    TestValidator.predicate(
      "has product variant",
      firstItem.productVariant !== null &&
        firstItem.productVariant !== undefined,
    );
    TestValidator.predicate("quantity positive", firstItem.quantity > 0);
    TestValidator.predicate(
      "unit price non-negative",
      firstItem.unitPrice >= 0,
    );
    TestValidator.equals("status is paid", firstItem.status, "paid");
  }
}
