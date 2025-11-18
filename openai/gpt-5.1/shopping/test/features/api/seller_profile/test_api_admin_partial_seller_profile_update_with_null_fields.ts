import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate that an authenticated admin can perform a partial seller profile
 * update where nullable fields are explicitly set to null while other fields
 * are left unchanged.
 *
 * Business flow:
 *
 * 1. Admin joins (creating an admin account and establishing an authenticated
 *    admin context).
 * 2. Seller joins, creating a seller account; capture sellerId from the authorized
 *    payload.
 * 3. As the seller, create a product to ensure seller catalog participation.
 * 4. As admin, create a category.
 * 5. As admin, link the product to that category.
 * 6. As seller, create a SKU under the product after admin creates a SKU inventory
 *    state that the SKU will reference.
 * 7. As admin, create a seller earning for this seller to simulate realistic
 *    financial activity.
 * 8. Initialize the seller profile by calling the admin profile update endpoint
 *    with all fields set to non-null values.
 * 9. Perform the main test update as admin, setting:
 *
 *    - Store_name to a new value
 *    - Support_email explicitly to null
 *    - Omitting store_description and support_phone
 * 10. Assert that:
 *
 * - Store_name has changed
 * - Support_email is null
 * - Store_description and support_phone are unchanged vs the baseline.
 *
 * 11. Re-issue the same partial update to verify idempotency and confirm that the
 *     profile remains unchanged on repeat.
 */
export async function test_api_admin_partial_seller_profile_update_with_null_fields(
  connection: api.IConnection,
) {
  // 1. Admin joins (and becomes authenticated via SDK side-effect)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.test" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller joins and becomes authenticated as seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.test" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);
  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  // 3. As seller, create a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: "https://cdn.shoppingmall.test/images/".concat(
      RandomGenerator.alphaNumeric(16),
    ) as string & tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Switch back to admin for admin-only operations (login just to be explicit)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.test" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 4. As admin, create a category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 5. As admin, link the product to that category
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 6. As admin, create an inventory state; then as seller create a SKU that uses it
  const inventoryStateCreateBody = {
    code: `state_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert(inventoryState);

  // Switch to seller again to create SKU
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.test" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active",
    price: 199.99,
    original_price: 249.99,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // Switch to admin to create a seller earning and to manage profile
  const adminLoginAuthorized2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized2);

  // 7. As admin, create a seller earning for this seller
  const earningCreateBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_item_id: null,
    shopping_mall_order_payment_id: null,
    currency_code: "USD" as string & tags.MinLength<1> & tags.MaxLength<3>,
    gross_amount: 200,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: 20,
    other_fee_amount: 0,
    net_earning_amount: 180,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: null,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const earning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId,
        body: earningCreateBody,
      },
    );
  typia.assert(earning);

  // 8. Initialize seller profile with all non-null values via admin profile.update
  const initialStoreName = RandomGenerator.paragraph({ sentences: 2 });
  const initialStoreDescription = RandomGenerator.paragraph({ sentences: 4 });
  const initialSupportEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const initialSupportPhone = RandomGenerator.mobile();

  const initialProfileUpdateBody = {
    store_name: initialStoreName,
    store_description: initialStoreDescription,
    support_email: initialSupportEmail,
    support_phone: initialSupportPhone,
  } satisfies IShoppingMallSellerProfile.IUpdate;

  const baselineProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.admin.sellers.profile.update(connection, {
      sellerId,
      body: initialProfileUpdateBody,
    });
  typia.assert(baselineProfile);

  TestValidator.equals(
    "baseline profile seller linkage",
    baselineProfile.shopping_mall_seller_id,
    sellerId,
  );
  TestValidator.equals(
    "baseline store_name set",
    baselineProfile.store_name,
    initialStoreName,
  );
  TestValidator.equals(
    "baseline store_description set",
    baselineProfile.store_description,
    initialStoreDescription,
  );
  TestValidator.equals(
    "baseline support_email set",
    baselineProfile.support_email,
    initialSupportEmail,
  );
  TestValidator.equals(
    "baseline support_phone set",
    baselineProfile.support_phone,
    initialSupportPhone,
  );

  // 9. Perform main partial update: change store_name, set support_email to null, omit others
  const newStoreName = RandomGenerator.paragraph({ sentences: 2 });
  const partialUpdateBody = {
    store_name: newStoreName,
    support_email: null,
  } satisfies IShoppingMallSellerProfile.IUpdate;

  const updatedProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.admin.sellers.profile.update(connection, {
      sellerId,
      body: partialUpdateBody,
    });
  typia.assert(updatedProfile);

  // 10. Validate field semantics
  TestValidator.equals(
    "seller id remains the same after update",
    updatedProfile.shopping_mall_seller_id,
    baselineProfile.shopping_mall_seller_id,
  );
  TestValidator.notEquals(
    "store_name should be changed",
    updatedProfile.store_name,
    baselineProfile.store_name,
  );
  TestValidator.equals(
    "store_name updated to new value",
    updatedProfile.store_name,
    newStoreName,
  );
  TestValidator.equals(
    "support_email explicitly set to null",
    updatedProfile.support_email,
    null,
  );
  TestValidator.equals(
    "store_description remains unchanged when omitted",
    updatedProfile.store_description,
    baselineProfile.store_description,
  );
  TestValidator.equals(
    "support_phone remains unchanged when omitted",
    updatedProfile.support_phone,
    baselineProfile.support_phone,
  );

  // 11. Re-issue same partial update for idempotency
  const idempotentProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.admin.sellers.profile.update(connection, {
      sellerId,
      body: partialUpdateBody,
    });
  typia.assert(idempotentProfile);

  // 12. Validate idempotency (key fields unchanged between successive partial updates)
  TestValidator.equals(
    "idempotent store_name",
    idempotentProfile.store_name,
    updatedProfile.store_name,
  );
  TestValidator.equals(
    "idempotent support_email",
    idempotentProfile.support_email,
    updatedProfile.support_email,
  );
  TestValidator.equals(
    "idempotent store_description",
    idempotentProfile.store_description,
    updatedProfile.store_description,
  );
  TestValidator.equals(
    "idempotent support_phone",
    idempotentProfile.support_phone,
    updatedProfile.support_phone,
  );
}
