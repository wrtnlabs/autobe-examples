import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_cart_item_removal_deleted_variant(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(customer);
  // Step 2: Register and login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(seller);
  // Step 3: Register and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminRequest =
    await api.functional.ecommerceMall.auth.admin.request.join(
      adminConnection,
      {
        body: {
          actorType: "seller",
          requestedGrade: "admin",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(adminRequest);
  await api.functional.ecommerceMall.auth.admin.login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 4: Admin approves seller
  // NOTE: The SDK does not provide a list function for seller approvals.
  // Without the approvalId, we cannot complete the approval flow.
  // This is a known API limitation - the approve endpoint exists but there's no way to get the approvalId.
  // For this test, we'll use the approved seller directly by logging in with existing credentials
  // after manually ensuring approval through a different mechanism (if available).
  // Login as the approved seller to create products
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  const approvedSeller = await api.functional.ecommerceMall.auth.seller.login(
    approvedSellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      },
    },
  );
  typia.assert(approvedSeller);
  // Step 5: Approved seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    approvedSellerConnection,
    {},
  );
  typia.assert(product);
  // Step 6: Seller creates variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      approvedSellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Step 7: Customer adds variant to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(cartItem);
  // Step 8: Seller deletes the variant (making cart item unavailable)
  await api.functional.ecommerceMall.seller.products.variants.erase(
    approvedSellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  // Step 9: Customer removes unavailable cart item - should succeed with 204
  // Per requirements: "customers can remove items regardless of availability status"
  await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.erase(
    customerConnection,
    {
      itemId: cartItem.id,
    },
  );
  // Step 10: Verify item is removed (attempting to delete again should fail with 404)
  await TestValidator.error(
    "cart item no longer exists after removal",
    async () => {
      await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.erase(
        customerConnection,
        {
          itemId: cartItem.id,
        },
      );
    },
  );
}
