import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_product_variants_inventory_records_adjustment_create } from "../../../generate/generate_random_mall_platform_seller_product_variants_inventory_records_adjustment_create";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_inventory_record } from "../../../prepare/prepare_random_mall_platform_inventory_record";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

export async function test_api_inventory_adjustment_create_for_seller_variant(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/seller/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const adjustmentAmount = Math.max(
    1,
    typia.random<number & tags.Type<"int32">>() % 10,
  );
  const adjustmentBody = {
    quantityChange: -adjustmentAmount,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformInventoryRecord.ICreate;
  const beforeHistory =
    await generate_random_mall_platform_seller_product_variants_inventory_records_adjustment_create(
      sellerConnection,
      {
        params: {
          productVariantId,
        },
        body: adjustmentBody,
      },
    );
  typia.assert(beforeHistory);
  const record =
    await generate_random_mall_platform_seller_product_variants_inventory_records_adjustment_create(
      sellerConnection,
      {
        params: {
          productVariantId,
        },
        body: adjustmentBody,
      },
    );
  typia.assert(record);
  TestValidator.equals(
    "inventory record variant id",
    record.productVariant.id,
    productVariantId,
  );
  TestValidator.equals(
    "inventory record quantity change",
    record.quantityChange,
    adjustmentBody.quantityChange,
  );
  TestValidator.equals(
    "inventory record reason",
    record.reason,
    adjustmentBody.reason,
  );
  TestValidator.equals("inventory record deletedAt", record.deletedAt, null);
  TestValidator.notEquals(
    "new inventory record should differ from prior history entry",
    beforeHistory.id,
    record.id,
  );
  TestValidator.notEquals(
    "inventory record timestamps should be new",
    beforeHistory.createdAt,
    record.createdAt,
  );
  TestValidator.predicate(
    "inventory record createdAt is present",
    record.createdAt.length > 0,
  );
  TestValidator.predicate(
    "inventory record updatedAt is present",
    record.updatedAt.length > 0,
  );
}
