import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotVariant";
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
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_variant_snapshot_list_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique credentials for seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "TestPass123!";
  // 1. Create admin account for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller account (starts as pending)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Admin approves the seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // 4. Seller logs in again with approved status
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Create a product with required fields
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      approvedSellerConnection,
      {},
    );
  typia.assert(product);
  // 6. Create a product variant with SKU, options, price and stock
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      approvedSellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          optionValues: [{ key: "color", value: "Red" }],
        },
      },
    );
  typia.assert(variant);
  // 7. Edit the variant to create a snapshot
  const newPrice =
    typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>() + 500;
  const updatedVariant =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.patchByProductidAndVariantid(
      approvedSellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: newPrice,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 8. Retrieve variant snapshots list
  const snapshotsResponse =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.snapshots.list(
      approvedSellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(snapshotsResponse);
  // 9. Validate response has paginated data
  TestValidator.equals(
    "has pagination data",
    snapshotsResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "has snapshots data",
    snapshotsResponse.data !== null,
    true,
  );
  // 10. Validate pagination metadata structure
  const pagination = snapshotsResponse.pagination;
  TestValidator.predicate("current page is valid", pagination.current >= 0);
  TestValidator.predicate("limit is valid", pagination.limit > 0);
  TestValidator.predicate("records count is valid", pagination.records >= 0);
  TestValidator.predicate("pages count is valid", pagination.pages >= 0);
  // 11. Validate at least one snapshot exists (created from the edit)
  TestValidator.predicate(
    "has at least one snapshot",
    snapshotsResponse.data.length > 0,
  );
  // 12. Validate snapshot structure
  const firstSnapshot = snapshotsResponse.data[0];
  TestValidator.equals("snapshot has id", firstSnapshot.id !== null, true);
  TestValidator.equals("snapshot has key", firstSnapshot.key !== null, true);
  TestValidator.equals(
    "snapshot has value",
    firstSnapshot.value !== null,
    true,
  );
  TestValidator.equals(
    "snapshot has created_at",
    firstSnapshot.created_at !== null,
    true,
  );
  // 13. Validate snapshot option values match original variant options
  TestValidator.equals(
    "snapshot key matches variant option",
    firstSnapshot.key,
    "color",
  );
  TestValidator.equals(
    "snapshot value matches variant option",
    firstSnapshot.value,
    "Red",
  );
}
