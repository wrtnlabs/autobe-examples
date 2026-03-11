import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_create";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";

export async function test_api_customer_wishlist_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>() as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>() as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"uri">,
        referrer: typia.random<string & tags.Format<"uri">>() as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"uri">,
      },
    });
  typia.assert(customer);
  // Create product_id for wishlist entry
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 2. Add product to customer's wishlist
  const wishlistEntry: IEcommerceMallWishlist =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      customerConnection,
      {
        body: { product_id: productId },
      },
    );
  typia.assert(wishlistEntry);
  // 3. Verify customer owns the wishlist entry
  TestValidator.equals(
    "customer matches",
    wishlistEntry.customer.id,
    customer.id,
  );
  // 4. Delete the wishlist entry
  await api.functional.ecommerceMall.customer.wishlist.erase(
    customerConnection,
    {
      wishlistId: wishlistEntry.id,
    },
  );
  // 5. Verify the product can be re-added to wishlist
  const reWishlistedEntry: IEcommerceMallWishlist =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      customerConnection,
      {
        body: { product_id: productId },
      },
    );
  typia.assert(reWishlistedEntry);
  TestValidator.equals(
    "product can be re-added",
    reWishlistedEntry.product.id,
    productId,
  );
}