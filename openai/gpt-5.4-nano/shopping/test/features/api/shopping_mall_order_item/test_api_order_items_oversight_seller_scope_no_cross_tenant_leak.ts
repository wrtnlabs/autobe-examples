import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_order_items_oversight_seller_scope_no_cross_tenant_leak(
  connection: api.IConnection,
): Promise<void> {
  // Create Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Create Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Fetch seller B order items to obtain identifiers for cross-tenant attempts.
  const sellerBOrderItemsPage =
    await api.functional.shoppingMall.member.order_items.oversight.index(
      sellerBConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sellerBOrderItemsPage);
  TestValidator.predicate(
    "seller B has at least one order item for test setup",
    () => sellerBOrderItemsPage.data.length > 0,
  );
  const sellerBFirst = sellerBOrderItemsPage.data[0];
  typia.assert(sellerBFirst);
  // Baseline: Seller A should have its own scoped items.
  const sellerAFirstPage =
    await api.functional.shoppingMall.member.order_items.oversight.index(
      sellerAConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sellerAFirstPage);
  TestValidator.predicate(
    "seller A has at least one order item for baseline access",
    () => sellerAFirstPage.data.length > 0,
  );
  // Attempt cross-tenant oversight using Seller B's identifiers.
  const crossTenantResult =
    await api.functional.shoppingMall.member.order_items.oversight.index(
      sellerAConnection,
      {
        body: {
          shoppingOrderId: sellerBFirst.shopping_mall_order_id,
          shipmentId: sellerBFirst.shopping_mall_shipment_id ?? undefined,
          lineItemStatus: sellerBFirst.line_item_status,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(crossTenantResult);
  TestValidator.equals(
    "cross-tenant orderId filter should match zero seller-scoped records",
    crossTenantResult.pagination.records,
    0,
  );
  TestValidator.predicate(
    "cross-tenant orderId filter should not return seller B items",
    () =>
      crossTenantResult.data.every(
        (item) =>
          item.shopping_mall_product_variant_id !==
            sellerBFirst.shopping_mall_product_variant_id &&
          item.seller_snapshot_id !== sellerBFirst.seller_snapshot_id,
      ),
  );
  // Edge validation: request unshipped items by using shipmentId=null.
  const unshippedShipmentResult =
    await api.functional.shoppingMall.member.order_items.oversight.index(
      sellerAConnection,
      {
        body: {
          shoppingOrderId: sellerBFirst.shopping_mall_order_id,
          shipmentId: null,
          lineItemStatus: sellerBFirst.line_item_status,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(unshippedShipmentResult);
  TestValidator.equals(
    "cross-tenant unshipped shipmentId=null filter should match zero seller-scoped records",
    unshippedShipmentResult.pagination.records,
    0,
  );
  TestValidator.predicate(
    "unshipped cross-tenant filter should not return seller B items",
    () =>
      unshippedShipmentResult.data.every(
        (item) =>
          item.shopping_mall_product_variant_id !==
            sellerBFirst.shopping_mall_product_variant_id &&
          item.seller_snapshot_id !== sellerBFirst.seller_snapshot_id,
      ),
  );
  // Additional sanity: mixed identifiers should not leak seller B variant/snapshot.
  const mixedResult =
    await api.functional.shoppingMall.member.order_items.oversight.index(
      sellerAConnection,
      {
        body: {
          shoppingOrderId: sellerBFirst.shopping_mall_order_id,
          shipmentId: null,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(mixedResult);
  TestValidator.equals(
    "mixed filter should match zero seller-scoped records",
    mixedResult.pagination.records,
    0,
  );
  TestValidator.predicate(
    "mixed filter should not include seller B product variant or seller snapshot",
    () =>
      mixedResult.data.every(
        (item) =>
          item.shopping_mall_product_variant_id !==
            sellerBFirst.shopping_mall_product_variant_id &&
          item.seller_snapshot_id !== sellerBFirst.seller_snapshot_id,
      ),
  );
}
