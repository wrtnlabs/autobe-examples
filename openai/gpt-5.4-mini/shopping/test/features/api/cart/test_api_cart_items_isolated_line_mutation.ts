import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_items_isolated_line_mutation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test isolated cart line mutation for a customer shopping cart.
   *
   * Verifies that updating one cart item by cartItemId only mutates the selected
   * line, while other cart lines retain their original variant references,
   * quantities, and availability states. Also validates that a rejected update
   * leaves the entire cart unchanged and does not merge or overwrite unrelated
   * cart lines.
   *
   * 1. Register an authenticated customer session.
   * 2. Read the current cart state and require multiple lines.
   * 3. Update one targeted cart item and validate isolation.
   * 4. Confirm the cart remains unchanged after a rejected mutation.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` as string &
        tags.Format<"email">,
      password: "Password1234!" as string & tags.Format<"password">,
      href: "http://localhost",
      referrer: "http://localhost",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: 1,
    limit: 50,
  } satisfies IMallPlatformCartItem.IRequest;
  const before = await api.functional.mallPlatform.customer.carts.items.index(
    customerConnection,
    {
      cartId,
      body,
    },
  );
  typia.assert(before);
  if (before.data.length < 2) return;
  const target = before.data[0];
  const untouched = before.data[1];
  const targetQuantity = target.quantity;
  const untouchedQuantity = untouched.quantity;
  const targetVariantId = target.productVariant.id;
  const untouchedVariantId = untouched.productVariant.id;
  const targetAvailability = target.availabilityState;
  const untouchedAvailability = untouched.availabilityState;
  const updated = await api.functional.mallPlatform.customer.carts.items.index(
    customerConnection,
    {
      cartId,
      body: {
        ...body,
        cartItemId: target.id,
        quantity: targetQuantity + 1,
      } satisfies IMallPlatformCartItem.IRequest,
    },
  );
  typia.assert(updated);
  const updatedTarget = updated.data.find((item) => item.id === target.id);
  const updatedUntouched = updated.data.find(
    (item) => item.id === untouched.id,
  );
  TestValidator.predicate(
    "target cart item should remain present after mutation",
    updatedTarget !== undefined,
  );
  TestValidator.predicate(
    "untouched cart item should remain present after mutation",
    updatedUntouched !== undefined,
  );
  if (updatedTarget === undefined || updatedUntouched === undefined) return;
  TestValidator.equals(
    "target line quantity should update only for the selected cart item",
    updatedTarget.quantity,
    targetQuantity + 1,
  );
  TestValidator.equals(
    "target line variant should remain unchanged",
    updatedTarget.productVariant.id,
    targetVariantId,
  );
  TestValidator.equals(
    "target line availability should remain unchanged",
    updatedTarget.availabilityState,
    targetAvailability,
  );
  TestValidator.equals(
    "untouched line quantity should remain unchanged",
    updatedUntouched.quantity,
    untouchedQuantity,
  );
  TestValidator.equals(
    "untouched line variant should remain unchanged",
    updatedUntouched.productVariant.id,
    untouchedVariantId,
  );
  TestValidator.equals(
    "untouched line availability should remain unchanged",
    updatedUntouched.availabilityState,
    untouchedAvailability,
  );
  await TestValidator.error("invalid cart mutation should fail", async () => {
    await api.functional.mallPlatform.customer.carts.items.index(
      customerConnection,
      {
        cartId,
        body: {
          ...body,
          cartItemId: target.id,
          quantity: 0,
        } satisfies IMallPlatformCartItem.IRequest,
      },
    );
  });
  const afterFailure =
    await api.functional.mallPlatform.customer.carts.items.index(
      customerConnection,
      {
        cartId,
        body,
      },
    );
  typia.assert(afterFailure);
  TestValidator.equals(
    "cart contents should remain unchanged after a rejected mutation",
    afterFailure.data,
    before.data,
  );
}
