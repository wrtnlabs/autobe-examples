import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_cancellation_request_snapshots_create } from "../../../generate/generate_random_shopping_mall_administrator_cancellation_request_snapshots_create";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request_snapshot } from "../../../prepare/prepare_random_shopping_mall_cancellation_request_snapshot";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_administrator_cancellation_request_snapshot_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // Admin connection is already authorized with fresh token
  // Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "sellerPass1234",
    shopName: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuth);
  await authorize_seller_login(sellerConnection, {
    body: { email: sellerJoinInput.email, password: sellerJoinInput.password },
  });
  // Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "customerPass1234",
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuth);
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoinInput.email,
      password: customerJoinInput.password,
    },
  });
  // Create product associated with seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        product_subcategory_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create product variant
  const variantCreateInput = {
    skuCode: RandomGenerator.alphabets(8),
    priceOverride: null,
    stockQuantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        body: variantCreateInput,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Create order by customer
  const orderCreateInput = {
    orderItems: [],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: orderCreateInput,
    },
  );
  typia.assert(order);
  // Create order item separately (though typically embedded, align with scenario)
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {
          shoppingMallOrderId: order.id,
          shoppingMallProductVariantId: variant.id,
          quantity: 1,
          status: "paid",
        } satisfies IShoppingMallOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);
  // Customer creates cancellation request
  const cancellationRequestCreateInput = {
    shoppingMallCustomerId: customerAuth.id,
    shoppingMallOrderItemId: orderItem.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallCancellationRequest.ICreate;
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: cancellationRequestCreateInput,
      },
    );
  typia.assert(cancellationRequest);
  // Administrator creates cancellation request snapshot
  const now = new Date().toISOString();
  const snapshotCreateInput = {
    cancellation_request_id: cancellationRequest.id,
    reason: cancellationRequest.reason,
    status: cancellationRequest.sellerApprovalStatus,
    created_at: now,
    updated_at: now,
  } satisfies IShoppingMallCancellationRequestSnapshot.ICreate;
  const snapshot =
    await generate_random_shopping_mall_administrator_cancellation_request_snapshots_create(
      adminConnection,
      {
        body: snapshotCreateInput,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot fields
  TestValidator.equals(
    "snapshot cancellation request id",
    snapshot.cancellationRequestId,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "snapshot reason",
    snapshot.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "snapshot status",
    snapshot.status,
    cancellationRequest.sellerApprovalStatus,
  );
  TestValidator.predicate(
    "snapshot id exists",
    typeof snapshot.id === "string" && snapshot.id.length > 0,
  );
  TestValidator.predicate(
    "snapshot createdAt is valid ISO string",
    typeof snapshot.createdAt === "string" && snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot updatedAt is valid ISO string",
    typeof snapshot.updatedAt === "string" && snapshot.updatedAt.length > 0,
  );
  TestValidator.equals("snapshot deletedAt is null", snapshot.deletedAt, null);
}
