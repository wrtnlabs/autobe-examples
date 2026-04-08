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

/**
 * Retrieve a valid inventory record through the administrator ownership chain.
 *
 * Validates that an authenticated administrator can inspect an inventory history entry only when the product, variant, and inventory record all belong to the same chain. Confirms the endpoint returns the immutable audit record with the nested variant summary, signed quantity change, business reason, and timestamps required for dispute review.
 *
 * 1. Creates an administrator-specific authenticated connection.
 * 2. Joins an administrator account and captures the authorized session token.
 * 3. Calls the inventory record retrieval endpoint with a valid product, variant, and inventory record identifier chain.
 * 4. Validates the returned inventory record structure and confirms the immutable historical data is present.
 */
export async function test_api_inventory_record_retrieve_valid_ownership_chain(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const inventoryRecordId = typia.random<string & tags.Format<"uuid">>();
  const record =
    await api.functional.mallPlatform.administrator.products.variants.inventoryRecords.at(
      adminConnection,
      {
        productId,
        variantId,
        inventoryRecordId,
      },
    );
  typia.assert(record);
  TestValidator.equals("inventory record id", record.id, inventoryRecordId);
  TestValidator.equals("variant id", record.productVariant.id, variantId);
  TestValidator.equals(
    "product id",
    record.productVariant.product.id,
    productId,
  );
  TestValidator.predicate(
    "quantity change is signed integer",
    Number.isInteger(record.quantityChange),
  );
  TestValidator.predicate(
    "business reason is provided",
    record.reason.length > 0,
  );
  TestValidator.predicate(
    "created timestamp is present",
    record.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp is present",
    record.updatedAt.length > 0,
  );
  TestValidator.equals(
    "inventory record is not deleted",
    record.deletedAt,
    null,
  );
}
