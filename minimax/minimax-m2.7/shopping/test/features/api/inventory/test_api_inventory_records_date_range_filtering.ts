import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_inventory_records_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate variant ID and date range for filtering
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // Date range: from 7 days ago to now
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fromDate = sevenDaysAgo.toISOString();
  const toDate = now.toISOString();
  // 3. Get first page of inventory records with date range filter
  const firstPage =
    await api.functional.ecommerceMall.superAdmin.productVariants.inventoryRecords.index(
      superAdminConnection,
      {
        variantId,
        body: {
          fromDate,
          toDate,
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(firstPage);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination exists",
    firstPage.pagination !== null,
    true,
  );
  // 5. Validate data array structure
  TestValidator.equals("data is array", Array.isArray(firstPage.data), true);
  // 6. If there are records, validate record structure
  for (const record of firstPage.data) {
    TestValidator.equals("record has id", record.id !== undefined, true);
    TestValidator.equals(
      "record has quantityChange",
      record.quantityChange !== undefined,
      true,
    );
    TestValidator.equals(
      "record has reason",
      record.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "record has createdAt",
      record.createdAt !== undefined,
      true,
    );
  }
  // 7. Test pagination - request second page (it will be empty if no records)
  const secondPage =
    await api.functional.ecommerceMall.superAdmin.productVariants.inventoryRecords.index(
      superAdminConnection,
      {
        variantId,
        body: {
          fromDate,
          toDate,
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate pagination metadata for second page
  TestValidator.equals(
    "second page pagination exists",
    secondPage.pagination !== null,
    true,
  );
  // 8. Test with different limit values
  const differentLimit =
    await api.functional.ecommerceMall.superAdmin.productVariants.inventoryRecords.index(
      superAdminConnection,
      {
        variantId,
        body: {
          fromDate,
          toDate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(differentLimit);
  TestValidator.equals(
    "different limit pagination exists",
    differentLimit.pagination !== null,
    true,
  );
  // 9. Test with only date filter (no pagination) - defaults should apply
  const defaultPagination =
    await api.functional.ecommerceMall.superAdmin.productVariants.inventoryRecords.index(
      superAdminConnection,
      {
        variantId,
        body: {
          fromDate,
          toDate,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(defaultPagination);
  TestValidator.equals(
    "default pagination has data array",
    Array.isArray(defaultPagination.data),
    true,
  );
}