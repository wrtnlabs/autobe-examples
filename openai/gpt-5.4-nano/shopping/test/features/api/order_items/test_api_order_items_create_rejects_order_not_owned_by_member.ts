import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_admin_product_snapshots_create } from "../../../generate/generate_random_shopping_mall_admin_product_snapshots_create";
import { generate_random_shopping_mall_member_order_items_create } from "../../../generate/generate_random_shopping_mall_member_order_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_snapshot";

export async function test_api_order_items_create_rejects_order_not_owned_by_member(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  await authorize_member_login(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  await authorize_member_login(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const sellerSnapshot =
    await generate_random_shopping_mall_admin_product_snapshots_create(
      adminConnection,
      {},
    );
  typia.assert(sellerSnapshot);
  const memberAOrder = await generate_random_shopping_mall_member_orders_create(
    memberAConnection,
    {},
  );
  typia.assert(memberAOrder);
  // Create a legitimate order item for member A so we can reuse valid variant/price/status fields
  const memberAOrderItem =
    await generate_random_shopping_mall_member_order_items_create(
      memberAConnection,
      {
        body: {
          shopping_mall_order_id: memberAOrder.id,
          seller_snapshot_id: sellerSnapshot.id,
          shopping_mall_shipment_id: null,
        },
      },
    );
  typia.assert(memberAOrderItem);
  await TestValidator.error(
    "reject order item creation for order not owned by member B",
    async () => {
      const createBody: IShoppingMallOrderItem.ICreate = {
        shopping_mall_order_id: memberAOrder.id,
        shopping_mall_product_variant_id:
          memberAOrderItem.shoppingMallProductVariantId,
        seller_snapshot_id: sellerSnapshot.id,
        shopping_mall_shipment_id: null,
        seller_price_at_purchase: memberAOrderItem.sellerPriceAtPurchase,
        quantity: memberAOrderItem.quantity,
        line_item_status: memberAOrderItem.lineItemStatus,
        placed_at: new Date().toISOString(),
      };
      await api.functional.shoppingMall.member.order_items.create(
        memberBConnection,
        {
          body: createBody,
        },
      );
    },
  );
}
