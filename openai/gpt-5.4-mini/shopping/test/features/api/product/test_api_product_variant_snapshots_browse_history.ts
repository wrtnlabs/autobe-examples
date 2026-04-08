import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

export async function test_api_product_variant_snapshots_browse_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Browse immutable product variant snapshot history for an administrator.
   *
   * This test validates that an administrator can access the product variant
   * snapshot browsing endpoint for a seller-owned product using isolated
   * actor-specific connections. It checks pagination shape, product scoping,
   * and the preserved summary fields that make the history read-only and useful
   * for audit browsing.
   *
   * 1. Create isolated seller and administrator connections.
   * 2. Create a seller-owned product using the seller actor.
   * 3. Browse the product variant snapshot history as an administrator.
   * 4. Validate page metadata and any returned snapshot rows.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(sellerJoin);
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminJoin);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(product);
  const request: IMallPlatformProductVariantSnapshot.IRequest = {
    page: 1,
    limit: 20,
    sort: "-created_at",
    search: product.id,
    createdAtFrom: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    createdAtTo: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  };
  const output =
    await api.functional.mallPlatform.administrator.products.variantSnapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "page metadata should be internally consistent",
    output.pagination.current >= 1 &&
      output.pagination.limit >= 1 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0 &&
      output.data.length <= output.pagination.limit &&
      output.pagination.current === request.page &&
      output.pagination.limit === request.limit,
  );
  TestValidator.predicate(
    "all snapshot rows should belong to the requested product",
    output.data.every((row) => row.product.id === product.id),
  );
  TestValidator.predicate(
    "snapshots should be returned newest first when multiple rows exist",
    output.data.length < 2 ||
      output.data.every(
        (row, index, array) =>
          index === 0 ||
          new Date(array[index - 1].created_at).getTime() >=
            new Date(row.created_at).getTime(),
      ),
  );
  TestValidator.predicate(
    "each snapshot should preserve the product and variant references",
    output.data.every(
      (row) =>
        row.product.id === product.id &&
        row.productVariant.id.length > 0 &&
        row.sku_code.length > 0 &&
        row.option_summary.length > 0 &&
        (row.price_override === null ||
          typeof row.price_override === "number") &&
        (row.snapshot_reason === null ||
          typeof row.snapshot_reason === "string") &&
        typeof row.created_at === "string",
    ),
  );
}
