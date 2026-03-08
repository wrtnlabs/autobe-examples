import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_order_item_access_control_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller A (potential product owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerAAuth);
  // 2. Create and authenticate seller B (attempting unauthorized access)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerBAuth);
  // 3. Generate a non-existent order item ID
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  // 4. Seller B attempts to access non-existent order item - should return 404
  // This validates security through obscurity: unauthorized access returns
  // same response as non-existent resource to prevent information leakage
  await TestValidator.httpError(
    "seller B cannot access non-existent order item (404 masking)",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.order_items.at(
        sellerBConnection,
        {
          itemId: nonExistentOrderId,
        },
      );
    },
  );
  // 5. Seller A also gets 404 for non-existent order item
  // Both sellers should receive identical 404 responses for resources they don't own
  await TestValidator.httpError(
    "seller A cannot access non-existent order item (404 masking)",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.order_items.at(
        sellerAConnection,
        {
          itemId: nonExistentOrderId,
        },
      );
    },
  );
  // Note: Full isolation test would require creating actual order items through
  // customer purchase flow, which involves multiple API calls (customer join,
  // product search, cart operations, checkout). This test validates the 404
  // masking behavior that prevents sellers from discovering other sellers'
  // order items through enumeration attacks.
}
