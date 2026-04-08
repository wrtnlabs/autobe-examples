import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_item_quantity_update_exceeds_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a cart item with simulation mode
  // Since seller APIs are not available, we use simulation to create cart item
  const simulatedConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  const cartItem: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
      simulatedConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartItem);
  // 3. Update quantity to exceed available stock (simulate stock of 5, request 100)
  const simulatedQuantity = cartItem.productVariant.quantity;
  const newQuantity = simulatedQuantity + 100; // Exceeds available stock
  const updatedItem: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.update(
      simulatedConnection,
      {
        itemId: cartItem.id,
        body: {
          quantity: newQuantity,
        } satisfies IEcommerceMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedItem);
  // 4. Validate the response
  // Verify stock warning is present when quantity exceeds stock
  TestValidator.predicate(
    "stock warning exists when quantity exceeds stock",
    updatedItem.stockWarning !== undefined && updatedItem.stockWarning !== null,
  );
  // Verify availability status changed to low_stock
  TestValidator.equals(
    "availability status is low_stock when quantity exceeds stock",
    updatedItem.availabilityStatus,
    "low_stock",
  );
  // Verify line subtotal is calculated with updated quantity
  TestValidator.equals(
    "line subtotal calculated with updated quantity",
    updatedItem.lineSubtotal,
    updatedItem.unitPrice * newQuantity,
  );
  // Verify quantity was updated
  TestValidator.equals(
    "quantity updated to requested value",
    updatedItem.quantity,
    newQuantity,
  );
}
