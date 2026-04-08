import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller inventory adjustment with negative quantity for loss recording.
 *
 * Validates that sellers can record inventory losses or corrections by adjusting variant stock downward with negative quantity changes. The test authenticates a seller and calls the inventory adjustment endpoint with a negative quantity_change value.
 *
 * This workflow ensures that inventory audit trails are properly maintained when sellers account for damaged goods, theft, or stock discrepancies. The system must create an immutable inventory record with the negative quantity change and business reason.
 *
 * 1. Seller registers and authenticates via join endpoint.
 * 2. Seller adjusts inventory with negative quantity_change and reason 'loss'.
 * 3. Validates the inventory record is created with correct negative quantity.
 * 4. Validates the reason field is properly stored.
 */
export async function test_api_inventory_adjustment_loss_negative_quantity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Adjust inventory with negative quantity (loss)
  // Note: Using randomly generated variant ID since product/variant creation SDK not available
  const lossAmount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
  >();
  const inventoryRecord =
    await api.functional.ecommerce.seller.variants.inventory.adjust(
      sellerConnection,
      {
        variantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          quantity_change: -lossAmount,
          reason: "loss",
        } satisfies IEcommerceInventoryRecord.IAdjust,
      },
    );
  typia.assert(inventoryRecord);
  // 3. Validate inventory record
  TestValidator.equals(
    "quantity change is negative",
    inventoryRecord.quantity_change,
    -lossAmount,
  );
  TestValidator.equals("reason is loss", inventoryRecord.reason, "loss");
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f-]{36}$/i.test(inventoryRecord.id),
  );
}
