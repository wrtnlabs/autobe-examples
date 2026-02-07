import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_superadmin_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for listing super admins
  const adminConnection: api.IConnection = { host: connection.host };
  // Get first page of super admins (page 1)
  const firstPage: IPageIEconomyPoliticsBoardSuperAdmin.ISummary =
    await api.functional.economyPoliticsBoard.superadmins.index(
      adminConnection,
      {
        body: {
          current: 1,
          limit: 20,
        } satisfies IEconomyPoliticsBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(firstPage);
  // Get second page of super admins (page 2)
  const secondPage: IPageIEconomyPoliticsBoardSuperAdmin.ISummary =
    await api.functional.economyPoliticsBoard.superadmins.index(
      adminConnection,
      {
        body: {
          current: 2,
          limit: 20,
        } satisfies IEconomyPoliticsBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate that both pages have data
  TestValidator.equals(
    "First page should contain items",
    firstPage.data.length > 0,
    true,
  );
  TestValidator.equals(
    "Second page should contain items",
    secondPage.data.length > 0,
    true,
  );
  // Create arrays of IDs for comparison
  const firstPageIds = firstPage.data.map((item) => item.id);
  const secondPageIds = secondPage.data.map((item) => item.id);
  // Validate no ID overlap between pages
  const idOverlap = firstPageIds.some((id) => secondPageIds.includes(id));
  TestValidator.equals("No overlapping IDs between pages", idOverlap, false);
  // Validate pagination metadata
  TestValidator.equals("First page current", firstPage.pagination.current, 1);
  TestValidator.equals("Second page current", secondPage.pagination.current, 2);
  TestValidator.equals(
    "Limit for both pages",
    firstPage.pagination.limit,
    secondPage.pagination.limit,
  );
  TestValidator.equals("Limit should be 20", firstPage.pagination.limit, 20);
  // Validate that the records count and total pages are consistent
  TestValidator.equals(
    "Total records should be greater than 20",
    firstPage.pagination.records,
    firstPage.data.length,
  );
  TestValidator.equals(
    "Total records should be the same for both pages",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "Total pages should be correctly calculated",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
}
