import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

export async function test_api_inventory_records_variant_history_listing(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId,
        },
        body: {
          skuCode: `sku-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: `option-${RandomGenerator.alphaNumeric(6)}`,
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const request: IMallPlatformInventoryRecord.IRequest = {
    page: 1,
    limit: 20,
    sort: "newest",
  };
  const response =
    await api.functional.mallPlatform.seller.productVariants.inventoryRecords.index(
      sellerConnection,
      {
        productVariantId: productId,
        body: request,
      },
    );
  typia.assert(response);
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination counts are non-negative",
    response.pagination.records >= 0 && response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all rows belong to requested variant",
    response.data.every((record) => record.productVariant.id === productId),
  );
  TestValidator.predicate(
    "rows expose signed quantity changes",
    response.data.every(
      (record) => record.quantityChange === record.quantityChange,
    ),
  );
  TestValidator.predicate(
    "rows expose reason and timestamps",
    response.data.every(
      (record) =>
        typeof record.reason === "string" &&
        typeof record.createdAt === "string" &&
        typeof record.updatedAt === "string",
    ),
  );
  TestValidator.predicate(
    "rows expose soft delete state",
    response.data.every(
      (record) =>
        record.deletedAt === null || typeof record.deletedAt === "string",
    ),
  );
  const filtered =
    await api.functional.mallPlatform.seller.productVariants.inventoryRecords.index(
      sellerConnection,
      {
        productVariantId: productId,
        body: {
          reason: RandomGenerator.alphabets(3),
          quantityDirection: "all",
          createdAtFrom: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
          createdAtTo: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          sort: "newest",
          page: 1,
          limit: 10,
        } satisfies IMallPlatformInventoryRecord.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.equals(
    "filtered pagination current",
    filtered.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered pagination limit",
    filtered.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "filtered rows belong to requested variant",
    filtered.data.every((record) => record.productVariant.id === productId),
  );
}
