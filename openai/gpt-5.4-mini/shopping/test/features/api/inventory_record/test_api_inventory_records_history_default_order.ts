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

export async function test_api_inventory_records_history_default_order(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(administrator);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformInventoryRecord.IRequest;
  const first =
    await api.functional.mallPlatform.administrator.products.variants.inventoryRecords.index(
      adminConnection,
      {
        productId,
        variantId,
        body: request,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.administrator.products.variants.inventoryRecords.index(
      adminConnection,
      {
        productId,
        variantId,
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "pagination current page",
    first.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "pagination page size",
    first.pagination.limit,
    request.limit ?? first.data.length,
  );
  TestValidator.predicate(
    "pagination data fits page size",
    first.data.length <= first.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages consistency",
    first.pagination.pages,
    first.pagination.limit === 0
      ? 0
      : Math.ceil(first.pagination.records / first.pagination.limit),
  );
  TestValidator.equals("read-only response stability", second, first);
  if (first.data.length > 1) {
    for (let index = 1; index < first.data.length; index += 1) {
      const previous = first.data[index - 1];
      const current = first.data[index];
      TestValidator.predicate(
        "default sort newest first",
        Date.parse(previous.createdAt) >= Date.parse(current.createdAt),
      );
    }
  }
  for (const record of first.data) {
    TestValidator.equals(
      "record product id",
      record.productVariant.product.id,
      productId,
    );
    TestValidator.equals(
      "record variant id",
      record.productVariant.id,
      variantId,
    );
    TestValidator.predicate(
      "record quantity change is integer",
      Number.isInteger(record.quantityChange),
    );
    TestValidator.predicate(
      "record reason is non-empty",
      record.reason.length > 0,
    );
    TestValidator.predicate(
      "record createdAt is present",
      record.createdAt.length > 0,
    );
    TestValidator.predicate(
      "record updatedAt is present",
      record.updatedAt.length > 0,
    );
    TestValidator.equals("record not soft deleted", record.deletedAt, null);
  }
}
