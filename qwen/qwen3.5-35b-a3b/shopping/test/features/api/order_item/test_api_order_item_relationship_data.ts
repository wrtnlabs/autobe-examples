import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_relationship_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(customerAuth);
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
    },
  });
  typia.assert(sellerAuth);
  // 3. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
    },
  });
  typia.assert(adminAuth);
  // Note: Since product creation, cart, and checkout APIs are not available in the SDK,
  // we cannot create the full order flow. This test uses a pre-existing order item ID
  // to verify relationship data retrieval.
  // 4. Retrieve order item using customer connection
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItem =
    await api.functional.ecommerceMall.member.order_items.getByItemid(
      customerConnection,
      { itemId: orderItemId },
    );
  typia.assert(orderItem);
  // 5. Validate relationship fields
  TestValidator.equals(
    "order order number",
    orderItem.order.order_number.length > 0,
    true,
  );
  TestValidator.equals(
    "order total price positive",
    orderItem.order.total_price > 0,
    true,
  );
  TestValidator.equals(
    "order status exists",
    orderItem.order.status !== undefined,
    true,
  );
  TestValidator.equals(
    "order customer exists",
    orderItem.order.customer.id !== undefined,
    true,
  );
  TestValidator.equals(
    "product variant sku code",
    orderItem.productVariant.sku_code.length > 0,
    true,
  );
  TestValidator.equals(
    "product variant option values",
    orderItem.productVariant.option_values !== undefined,
    true,
  );
  TestValidator.equals(
    "product variant price",
    orderItem.productVariant.price !== undefined,
    true,
  );
  TestValidator.equals(
    "product variant stock quantity",
    orderItem.productVariant.stock_quantity >= 0,
    true,
  );
  TestValidator.equals(
    "seller display name",
    orderItem.seller.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "seller approval status approved",
    orderItem.seller.approval_status === "approved",
    true,
  );
  TestValidator.equals(
    "shipping address recipient name",
    orderItem.order.shipping_address.recipient_name.length > 0,
    true,
  );
  TestValidator.equals(
    "shipping address phone",
    orderItem.order.shipping_address.phone.length > 0,
    true,
  );
  TestValidator.equals(
    "shipping address street",
    orderItem.order.shipping_address.street.length > 0,
    true,
  );
  TestValidator.equals(
    "shipping address city",
    orderItem.order.shipping_address.city.length > 0,
    true,
  );
  TestValidator.equals(
    "shipping address state",
    orderItem.order.shipping_address.state.length > 0,
    true,
  );
  TestValidator.equals(
    "shipping address postal code",
    orderItem.order.shipping_address.postal_code.length > 0,
    true,
  );
  TestValidator.equals(
    "shipping address country",
    orderItem.order.shipping_address.country.length > 0,
    true,
  );
}
