import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";

/**
 * Test that a seller cannot update products belonging to another seller.
 *
 * This test verifies the ownership verification business rule:
 * 1. First seller registers and gets approved, then creates a product
 * 2. Second seller registers and gets approved independently
 * 3. Second seller attempts to update the first seller's product via PUT request
 * 4. System returns 403 Forbidden with appropriate error message indicating unauthorized access
 */
export async function test_api_seller_product_update_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Create admin to approve sellers
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. First seller registration
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" as string & tags.Format<"password">,
      href: "https://example.com/seller1" as string & tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
    },
  });
  typia.assert(seller1Auth);
  // 3. Approve first seller
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminConnection,
    {
      body: {
        sellerId: seller1Auth.id,
        status: "approved",
      },
    },
  );
  // 4. First seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: "First Seller Product",
        description: "This product belongs to the first seller",
        base_price: 10000,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 5. Second seller registration
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" as string & tags.Format<"password">,
      href: "https://example.com/seller2" as string & tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
    },
  });
  typia.assert(seller2Auth);
  // 6. Approve second seller
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminConnection,
    {
      body: {
        sellerId: seller2Auth.id,
        status: "approved",
      },
    },
  );
  // 7. Second seller attempts to update first seller's product - should fail with 403
  await TestValidator.error("non-owner cannot update product", async () => {
    await api.functional.ecommerceMall.seller.products.update(
      seller2Connection,
      {
        productId: product.id,
        body: {
          name: "Hacked Product Name",
        },
      },
    );
  });
}
