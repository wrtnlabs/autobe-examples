import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";
import { generate_random_ecommerce_mall_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_wishlist_removal_unauthorized(connection: api.IConnection): Promise<void> {
    // 1. Create customer A (owner of wishlist entry)
    const customerAConnection: api.IConnection = { host: connection.host };
    const customerA = await authorize_customer_join(customerAConnection, {
        body: {
            email: (typia.random<string & tags.Format<"email">>()) satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
            password: (RandomGenerator.alphaNumeric(16)) satisfies string as string & tags.MinLength<8> & tags.Format<"password">,
            href: (typia.random<string & tags.Format<"uri">>()) satisfies string as string & tags.Format<"uri">,
            referrer: (typia.random<string & tags.Format<"uri">>()) satisfies string as string & tags.Format<"uri">,
        } satisfies IEcommerceMallCustomer.IJoin,
    });
    typia.assert(customerA);
    // 2. Create customer B (unauthorized user attempting removal)
    const customerBConnection: api.IConnection = { host: connection.host };
    const customerB = await authorize_customer_join(customerBConnection, {
        body: {
            email: (typia.random<string & tags.Format<"email">>()) satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
            password: (RandomGenerator.alphaNumeric(16)) satisfies string as string & tags.MinLength<8> & tags.Format<"password">,
            href: (typia.random<string & tags.Format<"uri">>()) satisfies string as string & tags.Format<"uri">,
            referrer: (typia.random<string & tags.Format<"uri">>()) satisfies string as string & tags.Format<"uri">,
        } satisfies IEcommerceMallCustomer.IJoin,
    });
    typia.assert(customerB);
    // 3. Customer A adds a product to their wishlist
    const randomProduct = typia.random<IEcommerceMallProduct.ISummary>();
    const wishlistEntry = await generate_random_ecommerce_mall_customer_wishlist_create(customerAConnection, {
        body: {
            product_id: randomProduct.id,
        } satisfies IEcommerceMallWishlist.ICreate,
    });
    typia.assert(wishlistEntry);
    // 4. Customer B attempts to delete customer A's wishlist entry
    await TestValidator.httpError("unauthorized removal should return 403 Forbidden", 403, async () => {
        await api.functional.ecommerceMall.customer.wishlist.erase(customerBConnection, {
            wishlistId: wishlistEntry.id,
        });
    });
    // 5. Confirm customer A can still delete their own wishlist entry (proves it still exists)
    await api.functional.ecommerceMall.customer.wishlist.erase(customerAConnection, {
        wishlistId: wishlistEntry.id,
    });
    void 0;
    // 6. Verify the entry was successfully removed by attempting to delete again (should return 404)
    await TestValidator.httpError("deleted wishlist entry should return 404 Not Found", 404, async () => {
        await api.functional.ecommerceMall.customer.wishlist.erase(customerAConnection, {
            wishlistId: wishlistEntry.id,
        });
    });
}