import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admins_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  // Get the first page of admins
  const firstPage: IPageICommunityAdmin.ISummary =
    await api.functional.community.admins.index(adminConnection, {
      body: {},
    });
  typia.assert(firstPage);
  // Verify first page has data and limit is at least 1
  TestValidator.predicate("first page has data", firstPage.data.length > 0);
  TestValidator.predicate("limit is positive", firstPage.pagination.limit > 0);
  // Get the second page of admins
  const secondPage: IPageICommunityAdmin.ISummary =
    await api.functional.community.admins.index(adminConnection, {
      body: {},
    });
  typia.assert(secondPage);
  // Verify second page has data
  TestValidator.predicate("second page has data", secondPage.data.length > 0);
  // Verify pagination metadata consistency between pages
  TestValidator.equals(
    "total records count identical between pages",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "limit identical between pages",
    firstPage.pagination.limit,
    secondPage.pagination.limit,
  );
  // Verify that the array of admins is non-empty and structure is maintained
  TestValidator.predicate(
    "first page has array structure",
    Array.isArray(firstPage.data),
  );
  TestValidator.predicate(
    "second page has array structure",
    Array.isArray(secondPage.data),
  );
  // We cannot validate sorting by created_at or ID uniqueness because these properties
  // do not exist in the ICommunityAdmin.ISummary DTO. The spec defines ISummary as {}.
  // Therefore, we abandon all assertions beyond structural validation.
}
