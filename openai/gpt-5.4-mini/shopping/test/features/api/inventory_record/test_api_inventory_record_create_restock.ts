import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_inventory_records_create";
import { prepare_random_mall_platform_inventory_record } from "../../../prepare/prepare_random_mall_platform_inventory_record";

export async function test_api_inventory_record_create_restock(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const body = {
    quantityChange: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    reason: `restock - ${RandomGenerator.alphabets(8)}`,
  } satisfies IMallPlatformInventoryRecord.ICreate;
  const created =
    await api.functional.mallPlatform.seller.products.variants.inventoryRecords.create(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        body,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "inventory record quantity change matches request",
    created.quantity_change,
    body.quantityChange,
  );
  TestValidator.equals(
    "inventory record reason matches request",
    created.reason,
    body.reason,
  );
  TestValidator.equals(
    "inventory record product variant id is present in response",
    created.mall_platform_product_variant_id,
    created.productVariant.id,
  );
  TestValidator.predicate(
    "inventory record has creation timestamp",
    () => created.created_at.length > 0,
  );
  TestValidator.predicate(
    "inventory record has update timestamp",
    () => created.updated_at.length > 0,
  );
}
