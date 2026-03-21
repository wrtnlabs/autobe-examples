import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
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

export async function test_api_seller_product_snapshots_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Create a new product (which creates initial snapshot)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Call PATCH /ecommerceMall/seller/products/{productId}/snapshots with empty body (default pagination)
  const snapshotList =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotList);
  // Validation: Response should contain pagination metadata
  TestValidator.equals(
    "pagination exists",
    snapshotList.pagination !== null,
    true,
  );
  TestValidator.equals("current page is 1", snapshotList.pagination.current, 1);
  TestValidator.equals(
    "default limit should be 20",
    snapshotList.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records should be at least 1",
    snapshotList.pagination.records >= 1,
  );
  // Validation: Response data should be an array
  TestValidator.equals("data is array", Array.isArray(snapshotList.data), true);
  // Validation: Should have at least 1 snapshot (initial creation)
  TestValidator.predicate(
    "has at least 1 snapshot",
    snapshotList.data.length >= 1,
  );
  // Validation: Each snapshot should have required fields
  const snapshot = snapshotList.data[0];
  TestValidator.equals("snapshot has id", snapshot.id !== null, true);
  TestValidator.equals("snapshot has name", snapshot.name !== null, true);
  TestValidator.equals(
    "snapshot has description",
    snapshot.description !== null,
    true,
  );
  TestValidator.equals(
    "snapshot has base_price",
    snapshot.base_price !== null,
    true,
  );
  TestValidator.equals(
    "snapshot has category_name",
    snapshot.category_name !== null,
    true,
  );
  TestValidator.equals(
    "snapshot has created_at",
    snapshot.created_at !== null,
    true,
  );
  TestValidator.equals("snapshot has seller", snapshot.seller !== null, true);
  // Validation: Initial snapshot matches product data
  TestValidator.equals(
    "snapshot name matches product",
    snapshot.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot description matches product",
    snapshot.description,
    product.description,
  );
  TestValidator.equals(
    "snapshot base_price matches product",
    snapshot.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "snapshot category_name matches product",
    snapshot.category_name,
    product.category.name,
  );
  // Validation: Seller in snapshot matches authenticated seller
  TestValidator.equals(
    "snapshot seller id matches",
    snapshot.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "snapshot seller email matches",
    snapshot.seller.email,
    sellerAuth.email,
  );
}
