import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_order_item_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member customer for order item retrieval
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(memberAuth);
  // 2. Login as member to retrieve order items
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerConnection, {
    body: {
      email: memberAuth.email,
      password: joinBody.password,
      href: joinBody.href,
      referrer: joinBody.referrer,
    } satisfies IEcommerceMallMember.ILogin,
  });
  // 3. Retrieve order item by UUID (simulating successful retrieval)
  // Note: In a real test, this would use an actual order item ID from the database
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItem =
    await api.functional.ecommerceMall.member.order_items.getByItemid(
      customerConnection,
      { itemId: orderItemId },
    );
  typia.assert(orderItem);
  // 4. Validate order item structure and relationships
  TestValidator.equals("order item id", orderItem.id, orderItemId);
  TestValidator.equals("quantity", orderItem.quantity, 1);
  TestValidator.notEquals("has order", orderItem.order, undefined);
  TestValidator.notEquals(
    "has product variant",
    orderItem.productVariant,
    undefined,
  );
  TestValidator.notEquals("has seller", orderItem.seller, undefined);
  TestValidator.equals(
    "order number",
    orderItem.order.order_number,
    orderItem.order.order_number,
  );
  TestValidator.equals("status", orderItem.status, orderItem.status);
  TestValidator.notEquals(
    "sku code exists",
    orderItem.productVariant.sku_code,
    undefined,
  );
  TestValidator.notEquals(
    "option values exists",
    orderItem.productVariant.option_values,
    undefined,
  );
  TestValidator.notEquals(
    "display name exists",
    orderItem.seller.display_name,
    undefined,
  );
  TestValidator.equals(
    "shipping address recipient",
    orderItem.order.shipping_address.recipient_name,
    orderItem.order.shipping_address.recipient_name,
  );
  TestValidator.predicate("unit price positive", orderItem.unit_price > 0);
  TestValidator.predicate("subtotal positive", orderItem.subtotal > 0);
  TestValidator.equals(
    "subtotal equals unit_price * quantity",
    orderItem.subtotal,
    orderItem.unit_price * orderItem.quantity,
  );
}