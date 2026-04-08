import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create two seller accounts
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerBAuth);
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAAuth);
  // Test: Seller B attempts to access a product variant that doesn't exist
  const randomProduct = typia.random<string & tags.Format<"uuid">>();
  const randomVariant = typia.random<string & tags.Format<"uuid">>();
  const inventoryRequest = {
    body: {
      search: null,
    } satisfies IEcommerceMallInventoryRecord.IRequest,
  };
  // Seller B trying to access non-existent product - expect 404 or 403
  await TestValidator.httpError(
    "non-existent product returns 404 or 403",
    [404, 403],
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.inventory.index(
        sellerBConnection,
        {
          productId: randomProduct,
          variantId: randomVariant,
          body: inventoryRequest.body,
        },
      );
    },
  );
  // Test: Seller A attempts to access another seller's random product - expect 403
  const anotherRandomProduct = typia.random<string & tags.Format<"uuid">>();
  const anotherRandomVariant = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized product access returns 403",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.products.variants.inventory.index(
        sellerAConnection,
        {
          productId: anotherRandomProduct,
          variantId: anotherRandomVariant,
          body: inventoryRequest.body,
        },
      );
    },
  );
}