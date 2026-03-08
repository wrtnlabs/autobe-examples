import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_item_snapshot_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Retrieve order item using admin connection
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItem = await api.functional.ecommerceMall.admin.order_items.at(
    adminConnection,
    {
      orderItemId,
    },
  );
  typia.assert(orderItem);
  // 3. Validate order item basic fields
  TestValidator.equals(
    "item_status type",
    typeof orderItem.item_status,
    "string",
  );
  TestValidator.equals("quantity valid", orderItem.quantity >= 1, true);
  TestValidator.equals("unit price valid", orderItem.unit_price >= 0, true);
  // 4. Validate product snapshot exists and contains required fields
  TestValidator.equals(
    "product_snapshot is string",
    typeof orderItem.product_snapshot,
    "string",
  );
  TestValidator.equals(
    "product_snapshot length > 0",
    orderItem.product_snapshot.length > 0,
    true,
  );
  const productSnapshot = JSON.parse(
    orderItem.product_snapshot,
  ) satisfies IEcommerceMallProduct.ISummary;
  typia.assert(productSnapshot);
  TestValidator.predicate(
    "product_snapshot has name",
    productSnapshot.name !== undefined && productSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "product_snapshot has description",
    productSnapshot.description !== undefined,
  );
  TestValidator.predicate(
    "product_snapshot has base_price",
    productSnapshot.base_price !== undefined && productSnapshot.base_price >= 0,
  );
  TestValidator.predicate(
    "product_snapshot has category",
    productSnapshot.category !== undefined,
  );
  TestValidator.predicate(
    "product_snapshot has seller",
    productSnapshot.seller !== undefined,
  );
  // 5. Validate variant snapshot exists and contains required fields
  TestValidator.equals(
    "variant_snapshot is string",
    typeof orderItem.variant_snapshot,
    "string",
  );
  TestValidator.equals(
    "variant_snapshot length > 0",
    orderItem.variant_snapshot.length > 0,
    true,
  );
  const variantSnapshot = JSON.parse(
    orderItem.variant_snapshot,
  ) satisfies IEcommerceMallProductVariant.ISummary;
  typia.assert(variantSnapshot);
  TestValidator.predicate(
    "variant_snapshot has skuCode",
    variantSnapshot.skuCode !== undefined,
  );
  TestValidator.predicate(
    "variant_snapshot has stockQuantity",
    variantSnapshot.stockQuantity >= 0,
  );
  TestValidator.predicate(
    "variant_snapshot has isActive",
    variantSnapshot.isActive !== undefined,
  );
  TestValidator.predicate(
    "variant_snapshot has displayPrice",
    variantSnapshot.displayPrice >= 0,
  );
  // 6. Validate seller profile snapshot exists and contains required fields
  TestValidator.equals(
    "seller_profile_snapshot is string",
    typeof orderItem.seller_profile_snapshot,
    "string",
  );
  TestValidator.equals(
    "seller_profile_snapshot length > 0",
    orderItem.seller_profile_snapshot.length > 0,
    true,
  );
  const sellerSnapshot = JSON.parse(
    orderItem.seller_profile_snapshot,
  ) satisfies IEcommerceMallSeller.ISummary;
  typia.assert(sellerSnapshot);
  TestValidator.predicate(
    "seller_snapshot has email",
    sellerSnapshot.email !== undefined,
  );
  TestValidator.predicate(
    "seller_snapshot has approval_status",
    sellerSnapshot.approval_status !== undefined,
  );
  TestValidator.predicate(
    "seller_snapshot has is_suspended",
    sellerSnapshot.is_suspended !== undefined,
  );
  TestValidator.predicate(
    "seller_snapshot has is_banned",
    sellerSnapshot.is_banned !== undefined,
  );
  // 7. Validate order reference exists and has correct structure
  typia.assert(orderItem.order);
  TestValidator.equals("order has id", orderItem.order.id !== undefined, true);
  TestValidator.equals(
    "order has order_number",
    orderItem.order.order_number !== undefined,
    true,
  );
  TestValidator.equals(
    "order has total_price",
    orderItem.order.total_price >= 0,
    true,
  );
  TestValidator.equals(
    "order has overall_status",
    orderItem.order.overall_status !== undefined,
    true,
  );
  TestValidator.equals(
    "order has created_at",
    orderItem.order.created_at !== undefined,
    true,
  );
}