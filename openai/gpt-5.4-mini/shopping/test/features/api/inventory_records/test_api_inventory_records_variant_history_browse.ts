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

export async function test_api_inventory_records_variant_history_browse(
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
  const request = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const output =
    await api.functional.mallPlatform.seller.products.variants.inventoryRecords.index(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "requested page",
    output.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "requested limit",
    output.pagination.limit,
    request.limit ?? 10,
  );
  TestValidator.predicate(
    "non-negative record count",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "non-negative page count",
    output.pagination.pages >= 0,
  );
  for (const record of output.data) {
    typia.assert(record);
    TestValidator.predicate(
      "inventory record has a variant summary",
      record.productVariant.id.length > 0,
    );
    TestValidator.predicate(
      "quantity change is an integer",
      Number.isInteger(record.quantityChange),
    );
    TestValidator.predicate("reason is provided", record.reason.length > 0);
    TestValidator.predicate(
      "createdAt is not after updatedAt",
      new Date(record.createdAt).getTime() <=
        new Date(record.updatedAt).getTime(),
    );
  }
}
