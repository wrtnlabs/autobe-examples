import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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

export async function test_api_inventory_records_variant_history_browse(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Browse inventory movement history for a seller-scoped product variant.
   *
   * Validates that the inventory history endpoint returns a paginated list of immutable movement records and that the response shape is suitable for seller-side audit browsing.
   *
   * Because the generated SDK does not expose product or variant creation APIs in this test surface, the scenario is exercised as a read-only browse request against generated identifiers. The assertions focus on pagination metadata, inventory-record shape, and chronological ordering when records are present.
   *
   * 1. Create an isolated seller connection from the base connection.
   * 2. Authenticate the seller with the provided seller join utility.
   * 3. Request the inventory history for a synthetic product and variant UUID pair.
   * 4. Validate pagination metadata and each returned inventory record.
   * 5. Ensure default ordering is newest-first when multiple records are returned.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const output =
    await api.functional.mallPlatform.seller.products.variants.inventoryRecords.index(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 5,
        } satisfies IMallPlatformInventoryRecord.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page is positive",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  for (const record of output.data) {
    TestValidator.predicate(
      "quantity change is an integer",
      Number.isInteger(record.quantityChange),
    );
    TestValidator.predicate(
      "reason is non-empty",
      record.reason.trim().length > 0,
    );
    TestValidator.predicate(
      "createdAt is a valid date-time string",
      !Number.isNaN(Date.parse(record.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is a valid date-time string",
      !Number.isNaN(Date.parse(record.updatedAt)),
    );
  }
  if (output.data.length >= 2) {
    TestValidator.predicate(
      "default ordering is newest first",
      new Date(output.data[0].createdAt).getTime() >=
        new Date(output.data[1].createdAt).getTime(),
    );
  }
}
