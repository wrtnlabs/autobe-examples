import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_inventory_record_variant_history_listing(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const firstPage =
    await api.functional.mallPlatform.administrator.productVariants.inventoryRecords.index(
      adminConnection,
      {
        productVariantId,
        body: {
          page: 1,
          limit: 10,
          sort: "newest",
        } satisfies IMallPlatformInventoryRecord.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  const firstPageData = firstPage.data;
  for (const record of firstPageData) {
    typia.assert(record);
    TestValidator.equals(
      "inventory record belongs to requested variant",
      record.productVariant.id,
      productVariantId,
    );
  }
  for (let index = 1; index < firstPageData.length; ++index) {
    const previous = firstPageData[index - 1];
    const current = firstPageData[index];
    TestValidator.predicate(
      "records are ordered newest first",
      new Date(previous.createdAt).getTime() >=
        new Date(current.createdAt).getTime(),
    );
  }
  const secondPage =
    await api.functional.mallPlatform.administrator.productVariants.inventoryRecords.index(
      adminConnection,
      {
        productVariantId,
        body: {
          page: 2,
          limit: 10,
          sort: "newest",
        } satisfies IMallPlatformInventoryRecord.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.predicate(
    "second page remains scoped to requested variant",
    secondPage.data.every(
      (record) => record.productVariant.id === productVariantId,
    ),
  );
}
