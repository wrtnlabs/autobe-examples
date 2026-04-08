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

export async function test_api_inventory_records_history_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const firstPage =
    await api.functional.mallPlatform.administrator.products.variants.inventoryRecords.index(
      adminConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 2,
        } satisfies IMallPlatformInventoryRecord.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page number", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  TestValidator.predicate(
    "first page records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data length within limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  if (firstPage.data.length > 0) {
    const scopedProductId: string = firstPage.data[0].productVariant.product.id;
    const scopedVariantId: string = firstPage.data[0].productVariant.id;
    const filteredPage =
      await api.functional.mallPlatform.administrator.products.variants.inventoryRecords.index(
        adminConnection,
        {
          productId: scopedProductId,
          variantId: scopedVariantId,
          body: {
            page: 1,
            limit: 1,
            search: firstPage.data[0].reason,
            reason: firstPage.data[0].reason,
          } satisfies IMallPlatformInventoryRecord.IRequest,
        },
      );
    typia.assert(filteredPage);
    TestValidator.equals(
      "filtered page number",
      filteredPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "filtered page limit",
      filteredPage.pagination.limit,
      1,
    );
    TestValidator.predicate(
      "filtered page data length within limit",
      filteredPage.data.length <= filteredPage.pagination.limit,
    );
    TestValidator.predicate(
      "filtered page respects variant scope",
      filteredPage.data.every(
        (record) =>
          record.productVariant.id === scopedVariantId &&
          record.productVariant.product.id === scopedProductId,
      ),
    );
    TestValidator.predicate(
      "filtered records preserve append-only order",
      filteredPage.data.every(
        (record, index, array) =>
          index === 0 || array[index - 1].createdAt >= record.createdAt,
      ),
    );
    TestValidator.predicate(
      "filtered records preserve signed quantity changes",
      filteredPage.data.every((record) => record.quantityChange !== 0),
    );
    TestValidator.predicate(
      "filtered records match requested reason",
      filteredPage.data.every(
        (record) => record.reason === firstPage.data[0].reason,
      ),
    );
    if (firstPage.pagination.pages > 1) {
      const secondPage =
        await api.functional.mallPlatform.administrator.products.variants.inventoryRecords.index(
          adminConnection,
          {
            productId: scopedProductId,
            variantId: scopedVariantId,
            body: {
              page: 2,
              limit: 1,
            } satisfies IMallPlatformInventoryRecord.IRequest,
          },
        );
      typia.assert(secondPage);
      TestValidator.equals(
        "second page number",
        secondPage.pagination.current,
        2,
      );
      TestValidator.equals("second page limit", secondPage.pagination.limit, 1);
      TestValidator.equals(
        "pagination metadata stays coherent",
        secondPage.pagination.records,
        firstPage.pagination.records,
      );
      TestValidator.equals(
        "pagination page count stays coherent",
        secondPage.pagination.pages,
        firstPage.pagination.pages,
      );
      TestValidator.predicate(
        "second page data length within limit",
        secondPage.data.length <= secondPage.pagination.limit,
      );
      TestValidator.predicate(
        "second page keeps the same variant scope",
        secondPage.data.every(
          (record) =>
            record.productVariant.id === scopedVariantId &&
            record.productVariant.product.id === scopedProductId,
        ),
      );
    }
  }
}
