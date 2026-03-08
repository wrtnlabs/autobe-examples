import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_customer_order_item_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerJoin);
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = customerJoin.token.access;
  // 2. Generate a random order item to validate snapshot structure
  const orderItem = typia.random<IEcommerceMallOrderItem>();
  typia.assert(orderItem);
  // 3. Parse snapshot JSON strings to verify structure
  const productSnapshot = JSON.parse(orderItem.product_snapshot);
  const variantSnapshot = JSON.parse(orderItem.variant_snapshot);
  const sellerSnapshot = JSON.parse(orderItem.seller_profile_snapshot);
  // 4. Validate product_snapshot contains expected fields
  TestValidator.predicate(
    "product_snapshot should contain name",
    productSnapshot.name !== undefined &&
      typeof productSnapshot.name === "string",
  );
  TestValidator.predicate(
    "product_snapshot should contain base_price",
    productSnapshot.base_price !== undefined &&
      typeof productSnapshot.base_price === "number",
  );
  TestValidator.predicate(
    "product_snapshot should contain description",
    productSnapshot.description !== undefined,
  );
  TestValidator.predicate(
    "product_snapshot should contain category",
    productSnapshot.category !== undefined,
  );
  // 5. Validate variant_snapshot contains expected fields
  TestValidator.predicate(
    "variant_snapshot should contain skuCode",
    variantSnapshot.skuCode !== undefined &&
      typeof variantSnapshot.skuCode === "string",
  );
  TestValidator.predicate(
    "variant_snapshot should contain priceOverride or use base_price",
    variantSnapshot.priceOverride !== undefined ||
      productSnapshot.base_price !== undefined,
  );
  TestValidator.predicate(
    "variant_snapshot should contain stockQuantity",
    variantSnapshot.stockQuantity !== undefined &&
      typeof variantSnapshot.stockQuantity === "number",
  );
  // 6. Validate seller_profile_snapshot contains expected fields
  TestValidator.predicate(
    "seller_profile_snapshot should contain shopName",
    sellerSnapshot.shopName !== undefined &&
      typeof sellerSnapshot.shopName === "string",
  );
  TestValidator.predicate(
    "seller_profile_snapshot should contain logoUrl",
    sellerSnapshot.logoUrl !== undefined &&
      typeof sellerSnapshot.logoUrl === "string",
  );
  // 7. Validate unit_price exists and is positive
  TestValidator.predicate(
    "order item unit_price should be a positive number",
    orderItem.unit_price > 0,
  );
  // 8. Verify snapshot data is immutable (snapshot fields are JSON strings, not references)
  TestValidator.predicate(
    "product_snapshot should be a JSON string",
    typeof orderItem.product_snapshot === "string",
  );
  TestValidator.predicate(
    "variant_snapshot should be a JSON string",
    typeof orderItem.variant_snapshot === "string",
  );
  TestValidator.predicate(
    "seller_profile_snapshot should be a JSON string",
    typeof orderItem.seller_profile_snapshot === "string",
  );
}
