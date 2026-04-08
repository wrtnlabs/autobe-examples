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

export async function test_api_inventory_records_variant_history_filtered_audit(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const requestedPage = 1;
  const requestedLimit = 10;
  const requestedFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const requestedTo = new Date().toISOString();
  const output =
    await api.functional.mallPlatform.seller.products.variants.inventoryRecords.index(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: requestedPage,
          limit: requestedLimit,
          sort: "-createdAt",
          createdAtFrom: requestedFrom,
          createdAtTo: requestedTo,
          reason: "restock",
          quantityChangeDirection: "positive",
        } satisfies IMallPlatformInventoryRecord.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "requested page number should be preserved",
    output.pagination.current,
    requestedPage,
  );
  TestValidator.equals(
    "requested page size should be preserved",
    output.pagination.limit,
    requestedLimit,
  );
  TestValidator.predicate(
    "pagination record count should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned page size should not exceed the requested limit",
    output.data.length <= requestedLimit,
  );
  const ordered = [...output.data].sort((left, right) => {
    if (left.createdAt > right.createdAt) return -1;
    if (left.createdAt < right.createdAt) return 1;
    return 0;
  });
  TestValidator.equals(
    "inventory records should be ordered newest first",
    output.data,
    ordered,
  );
  for (const record of output.data) {
    TestValidator.predicate(
      "inventory record timestamp should be inside the requested reporting window",
      record.createdAt >= requestedFrom && record.createdAt <= requestedTo,
    );
    TestValidator.predicate(
      "inventory record reason should match the requested audit keyword",
      record.reason.toLowerCase().includes("restock"),
    );
    TestValidator.predicate(
      "inventory record quantity change should be positive for restocking audit views",
      record.quantityChange > 0,
    );
  }
}
