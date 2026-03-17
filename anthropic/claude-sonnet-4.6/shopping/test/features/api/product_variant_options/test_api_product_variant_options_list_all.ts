import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantOption";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_variant_options_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and get admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create product category (requires admin auth)
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: "Test Category " + RandomGenerator.alphabets(6) } },
  );
  typia.assert(category);
  // 3. Seller setup - join and get seller connection
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // 5. Admin approves the seller
  const updatedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(updatedApproval);
  // 6. Seller re-logs in after approval to refresh session with approved status
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 7. Create product under approved seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
        categoryId: category.id,
        images: [],
        variants: [],
      },
    },
  );
  typia.assert(product);
  // 8. Create a variant with two options: color=Blue (sequence 0), size=Large (sequence 1)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku: "SKU-TEST-" + RandomGenerator.alphaNumeric(8),
          priceOverride: null,
          options: [
            {
              key: "color",
              value: "Blue",
              sequence: 0 as number & tags.Type<"int32">,
            },
            {
              key: "size",
              value: "Large",
              sequence: 1 as number & tags.Type<"int32">,
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // 9. Call the options list endpoint with empty body (public endpoint, no auth needed)
  const publicConnection: api.IConnection = { host: connection.host };
  const result =
    await api.functional.shoppingMall.products.variants.options.index(
      publicConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {} satisfies IShoppingMallProductVariantOption.IRequest,
      },
    );
  typia.assert(result);
  // 10. Validate pagination metadata
  TestValidator.equals(
    "records count matches options created",
    result.pagination.records,
    2,
  );
  TestValidator.predicate("data array has 2 items", result.data.length === 2);
  TestValidator.predicate(
    "current page is at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate("pages is at least 1", result.pagination.pages >= 1);
  // 11. Validate options content and ordering (ordered by sequence ascending)
  const firstOption = result.data[0];
  const secondOption = result.data[1];
  TestValidator.equals("first option key is color", firstOption!.key, "color");
  TestValidator.equals(
    "first option value is Blue",
    firstOption!.value,
    "Blue",
  );
  TestValidator.predicate(
    "first option sequence is 0",
    (firstOption!.sequence as number) === 0,
  );
  TestValidator.equals("second option key is size", secondOption!.key, "size");
  TestValidator.equals(
    "second option value is Large",
    secondOption!.value,
    "Large",
  );
  TestValidator.predicate(
    "second option sequence is 1",
    (secondOption!.sequence as number) === 1,
  );
  // 12. Validate sequence ordering is ascending
  TestValidator.predicate(
    "options are ordered by sequence ascending",
    (firstOption!.sequence as number) < (secondOption!.sequence as number),
  );
}
