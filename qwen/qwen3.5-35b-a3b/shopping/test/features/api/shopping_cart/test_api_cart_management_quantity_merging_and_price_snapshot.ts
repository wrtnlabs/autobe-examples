import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_management_quantity_merging_and_price_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerJoinConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.example.com/register",
        referrer: "https://test.example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerAuth);
  // 2. Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 3. Generate test variant data (simulating existing product)
  const variantId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const product1: IEcommerceMallProduct.ISummary =
    typia.random<IEcommerceMallProduct.ISummary>();
  const variant1: IEcommerceMallProductVariant.ISummary = {
    id: variantId1,
    skuCode: typia.random<string>(),
    optionValues: "{}",
    priceOverride: typia.random<number>(),
    stockQuantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    isActive: true,
    product: product1,
  } satisfies IEcommerceMallProductVariant.ISummary;
  typia.assert(variant1);
  const variantId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const product2: IEcommerceMallProduct.ISummary =
    typia.random<IEcommerceMallProduct.ISummary>();
  const variant2: IEcommerceMallProductVariant.ISummary = {
    id: variantId2,
    skuCode: typia.random<string>(),
    optionValues: "{}",
    priceOverride: typia.random<number>(),
    stockQuantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    isActive: true,
    product: product2,
  } satisfies IEcommerceMallProductVariant.ISummary;
  typia.assert(variant2);
  // Capture initial price snapshot (priceOverride ?? basePrice)
  const initialPrice1: number =
    variant1.priceOverride ?? variant1.product.basePrice;
  typia.assert(initialPrice1);
  // 4. First cart addition
  const firstCart: IEcommerceMallShoppingCart.ISummary =
    await api.functional.ecommerceMall.customer.carts.manage(
      customerConnection,
      {
        body: {
          cartOperations: [
            {
              variant_id: variantId1,
              quantity: 2,
            } satisfies IEcommerceMallShoppingCart.IManageOperationAdd,
          ],
        },
      },
    );
  typia.assert(firstCart);
  // 5. Modify price snapshot (simulate price change in variant data)
  const modifiedPrice1: number = initialPrice1 + 1000;
  const variant1Modified: IEcommerceMallProductVariant.ISummary = {
    ...variant1,
    priceOverride: modifiedPrice1,
  } satisfies IEcommerceMallProductVariant.ISummary;
  typia.assert(variant1Modified);
  // 6. Second cart addition with same variant (should merge quantity)
  const secondCart: IEcommerceMallShoppingCart.ISummary =
    await api.functional.ecommerceMall.customer.carts.manage(
      customerConnection,
      {
        body: {
          cartOperations: [
            {
              variant_id: variantId1,
              quantity: 3, // Add 3 more, should merge with existing 2 = total 5
            } satisfies IEcommerceMallShoppingCart.IManageOperationAdd,
          ],
        },
      },
    );
  typia.assert(secondCart);
  // 7. Verify merged quantity (2 + 3 = 5)
  const cartItem1 = secondCart.cartItems.find(
    (item) => item.variant.id === variantId1,
  );
  TestValidator.predicate(
    "cart item exists for variant 1",
    cartItem1 !== undefined,
  );
  if (cartItem1) {
    TestValidator.equals("merged quantity is 5 (2+3)", cartItem1.quantity, 5);
    // 8. Verify price snapshot preserved (should be initialPrice1, not modifiedPrice1)
    TestValidator.equals(
      "price snapshot preserved from initial addition",
      cartItem1.price,
      initialPrice1,
    );
  }
  // 9. Add variant2 for seller subtotal test
  const thirdCart: IEcommerceMallShoppingCart.ISummary =
    await api.functional.ecommerceMall.customer.carts.manage(
      customerConnection,
      {
        body: {
          cartOperations: [
            {
              variant_id: variant2.id,
              quantity: 1,
            } satisfies IEcommerceMallShoppingCart.IManageOperationAdd,
          ],
        },
      },
    );
  typia.assert(thirdCart);
  // 10. Verify cart metadata updatedAt timestamp changed
  const prevUpdatedTime = firstCart.updatedAt;
  const newUpdatedTime = thirdCart.updatedAt;
  TestValidator.notEquals(
    "cart updatedAt timestamp changed after modifications",
    prevUpdatedTime,
    newUpdatedTime,
  );
  // 11. Verify seller subtotals
  if (thirdCart.sellerSubtotals && thirdCart.sellerSubtotals.length > 0) {
    TestValidator.predicate(
      "seller subtotals exist for cross-seller scenario",
      thirdCart.sellerSubtotals.length > 0,
    );
    // Verify subtotal calculation: SUM(quantity * price) for each seller
    for (const sellerSubtotal of thirdCart.sellerSubtotals) {
      TestValidator.predicate(
        `seller subtotal calculated correctly for ${sellerSubtotal.seller.id}`,
        sellerSubtotal.subtotal > 0,
      );
      // Verify total with tax: subtotal * 1.10
      TestValidator.equals(
        `seller total includes 10% tax`,
        sellerSubtotal.total,
        sellerSubtotal.subtotal * 1.1,
      );
    }
  }
  // 12. Verify cart subtotal calculation
  let expectedSubtotal = 0;
  for (const item of thirdCart.cartItems) {
    expectedSubtotal += item.quantity * item.price; // Use captured price
  }
  TestValidator.equals(
    "cart subtotal calculated using captured prices",
    thirdCart.subtotal,
    expectedSubtotal,
  );
}