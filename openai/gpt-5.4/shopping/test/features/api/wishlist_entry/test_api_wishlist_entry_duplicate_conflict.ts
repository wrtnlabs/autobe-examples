import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_wishlist_entries_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_entries_create";
import { prepare_random_shopping_mall_wishlist_entry } from "../../../prepare/prepare_random_shopping_mall_wishlist_entry";

export async function test_api_wishlist_entry_duplicate_conflict(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password1234!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);
  const firstEntry: IShoppingMallWishlistEntry =
    await generate_random_shopping_mall_customer_wishlist_entries_create(
      customerConnection,
      {},
    );
  typia.assert(firstEntry);
  TestValidator.equals(
    "wishlist entry belongs to authenticated customer",
    firstEntry.customer.id,
    customer.id,
  );
  TestValidator.equals("wishlist entry is active", firstEntry.deleted_at, null);
  const duplicateBody = {
    shopping_mall_product_id: firstEntry.product.id,
  } satisfies IShoppingMallWishlistEntry.ICreate;
  await TestValidator.error(
    "duplicate wishlist entry for same customer and product must be rejected",
    async () => {
      await generate_random_shopping_mall_customer_wishlist_entries_create(
        customerConnection,
        {
          body: duplicateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "original wishlist entry customer remains unchanged",
    firstEntry.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "original wishlist entry product remains unchanged",
    firstEntry.product.id,
    duplicateBody.shopping_mall_product_id,
  );
  TestValidator.equals(
    "original wishlist entry remains active after duplicate rejection",
    firstEntry.deleted_at,
    null,
  );
}
