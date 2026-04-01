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

export async function test_api_inventory_records_variant_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const limit = 2;
  const firstPage =
    await api.functional.mallPlatform.seller.productVariants.inventoryRecords.index(
      sellerConnection,
      {
        productVariantId,
        body: {
          page: 1,
          limit,
          sort: "newest",
        } satisfies IMallPlatformInventoryRecord.IRequest,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.mallPlatform.seller.productVariants.inventoryRecords.index(
      sellerConnection,
      {
        productVariantId,
        body: {
          page: 2,
          limit,
          sort: "newest",
        } satisfies IMallPlatformInventoryRecord.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, limit);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, limit);
  TestValidator.equals(
    "same total record count",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "same total page count",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  TestValidator.predicate(
    "first page scoped to requested variant",
    firstPage.data.every(
      (record) => record.productVariant.id === productVariantId,
    ),
  );
  TestValidator.predicate(
    "second page scoped to requested variant",
    secondPage.data.every(
      (record) => record.productVariant.id === productVariantId,
    ),
  );
  TestValidator.predicate(
    "page size respects limit",
    firstPage.data.length <= limit && secondPage.data.length <= limit,
  );
  TestValidator.predicate(
    "pages do not overlap",
    firstPage.data.every(
      (left) => !secondPage.data.some((right) => right.id === left.id),
    ),
  );
  const combined = [...firstPage.data, ...secondPage.data];
  TestValidator.predicate(
    "newest ordering across queried pages",
    combined.every(
      (record, index, array) =>
        index === 0 || array[index - 1].createdAt >= record.createdAt,
    ),
  );
}
