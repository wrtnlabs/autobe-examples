import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_inventory_record_retrieve_product_variant_mismatch(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator inventory record retrieval rejects an invalid product and variant chain.
   *
   * This test validates that the administrator inventory record detail endpoint enforces the full
   * product -> variant -> inventory record ownership chain. It authenticates an administrator,
   * then requests an inventory record using unrelated identifiers and asserts that the endpoint
   * responds with a not found error instead of exposing inventory history from another product.
   *
   * 1. Create an authenticated administrator connection through administrator join.
   * 2. Generate unrelated product, variant, and inventory record identifiers.
   * 3. Request an inventory record using the mismatched path parameters.
   * 4. Assert the endpoint responds with a not found HTTP error.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(admin);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const inventoryRecordId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator inventory record retrieval should reject invalid ownership chain",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.products.variants.inventoryRecords.at(
        adminConnection,
        {
          productId,
          variantId,
          inventoryRecordId,
        },
      );
    },
  );
}
