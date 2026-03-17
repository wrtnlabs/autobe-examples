import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_admin_variant_snapshots_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<(string & tags.Format<"uri">)>() ,
        referrer: typia.random<(string & tags.Format<"uri">)>() ,
      },
    },
  );
  typia.assert(seller);
  // Seller login to create product
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_login(sellerLoginConnection, {
      body: {
        email: seller.email,
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(sellerLogin);
  // 2. Create product with variants
  const product: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerLoginConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 3. First variant update - creates snapshot at T1
  const variantId = product.variants[0].id;
  const productId = product.id;
  const t1 = new Date();
  const t1ISOString = t1.toISOString();
  const firstUpdate: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerLoginConnection,
      {
        productId,
        variantId,
        body: {
          sku: typia.random<string>(),
          options: { size: "Large", color: "Red" },
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  // 4. Wait briefly for second snapshot
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Second variant update - creates snapshot at T2
  const t2 = new Date();
  const t2ISOString = t2.toISOString();
  const secondUpdate: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerLoginConnection,
      {
        productId,
        variantId,
        body: {
          sku: typia.random<string>(),
          options: { size: "Medium", color: "Blue" },
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // 6. Setup admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<(string & tags.Format<"uri">)>() ,
        referrer: typia.random<(string & tags.Format<"uri">)>() ,
      },
    },
  );
  typia.assert(adminJoin);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_login(
    adminLoginConnection,
    {
      body: {
        email: adminJoin.email,
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(admin);
  // 7. Query snapshots with date range covering both T1 and T2
  const allSnapshotsResponse: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminLoginConnection,
      {
        productId,
        variantId,
        body: {
          fromDate: t1ISOString,
          toDate: t2ISOString,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshotsResponse);
  // 8. Query snapshots before T2
  const beforeT2Response: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminLoginConnection,
      {
        productId,
        variantId,
        body: {
          toDate: t2ISOString,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(beforeT2Response);
  // 9. Query snapshots after T1
  const afterT1Response: IPageIEcommerceMallProductVariantSnapshot.ISummary =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminLoginConnection,
      {
        productId,
        variantId,
        body: {
          fromDate: t1ISOString,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(afterT1Response);
  // 10. Validate date filtering
  // Total snapshots should be 2 (both T1 and T2)
  TestValidator.equals(
    "total snapshots in range",
    allSnapshotsResponse.data.length,
    2,
  );
  // Snapshots before T2 should include both (T1 is before T2)
  TestValidator.equals("snapshots before T2", beforeT2Response.data.length, 2);
  // Snapshots after T1 should include both (T2 is after T1)
  TestValidator.equals("snapshots after T1", afterT1Response.data.length, 2);
  // Validate snapshot ordering (newest first)
  const timestamps = allSnapshotsResponse.data.map((s) =>
    new Date(s.created_at).getTime(),
  );
  TestValidator.equals(
    "snapshots are ordered newest first",
    timestamps[0] >= timestamps[1],
    true,
  );
}
