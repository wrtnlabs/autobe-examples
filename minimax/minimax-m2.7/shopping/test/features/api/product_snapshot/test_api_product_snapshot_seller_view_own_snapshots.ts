import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_snapshot_seller_view_own_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 2. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.admin.request.join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. Login as admin
  const loggedInAdminConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await api.functional.ecommerceMall.auth.admin.login(
    loggedInAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(adminLoginResult);
  // 4. Create category as admin
  const category = await api.functional.ecommerceMall.admin.categories.create(
    loggedInAdminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 5. Create product as seller
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Edit product to create first snapshot
  const firstEdit = await api.functional.ecommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IEcommerceMallProduct.IUpdate,
    },
  );
  typia.assert(firstEdit);
  // 7. Edit product again to create second snapshot
  const secondEdit = await api.functional.ecommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: RandomGenerator.name(3),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.IUpdate,
    },
  );
  typia.assert(secondEdit);
  // 8. Retrieve product snapshots with pagination
  const snapshotsResponse =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 9. Validate snapshots response structure
  TestValidator.equals(
    "has pagination info",
    snapshotsResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "has snapshots data array",
    Array.isArray(snapshotsResponse.data),
    true,
  );
  TestValidator.predicate(
    "has at least 2 snapshots",
    snapshotsResponse.data.length >= 2,
  );
  // 10. Validate first snapshot has all required fields
  const firstSnapshot = snapshotsResponse.data[0];
  TestValidator.equals("snapshot has id", firstSnapshot.id !== null, true);
  TestValidator.equals("snapshot has name", firstSnapshot.name !== null, true);
  TestValidator.equals(
    "snapshot has basePrice",
    firstSnapshot.basePrice !== null,
    true,
  );
  TestValidator.equals(
    "snapshot has categoryName",
    firstSnapshot.categoryName !== null,
    true,
  );
  TestValidator.equals(
    "snapshot has createdAt",
    firstSnapshot.createdAt !== null,
    true,
  );
  TestValidator.equals(
    "snapshot has sourceType",
    firstSnapshot.sourceType !== null,
    true,
  );
  TestValidator.equals(
    "sourceType is product_edit",
    firstSnapshot.sourceType,
    "product_edit",
  );
  // 11. Validate seller information is included in snapshot
  TestValidator.equals(
    "snapshot has seller",
    firstSnapshot.seller !== null,
    true,
  );
  TestValidator.equals("seller has id", firstSnapshot.seller.id !== null, true);
  TestValidator.equals(
    "seller has email",
    firstSnapshot.seller.email !== null,
    true,
  );
  // 12. Test pagination with smaller limit
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 1,
          page: 1,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "limited to 1 snapshot",
    paginatedResponse.data.length,
    1,
  );
  TestValidator.equals(
    "pagination total records > 1",
    snapshotsResponse.data.length > paginatedResponse.data.length,
    true,
  );
}