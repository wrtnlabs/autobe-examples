import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_administrators_filtered_all_active(
  connection: api.IConnection,
): Promise<void> {
  const response = await api.functional.economyPoliticsBoard.admins.index(
    connection,
    {
      body: typia.random<IEconomyPoliticsBoardAdmin.IRequest>(),
    },
  );
  typia.assert(response);
  // Validate pagination data
  TestValidator.predicate(
    "Pagination records count is positive",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "Pagination should have at least one page",
    response.pagination.pages > 0,
  );
  // Validate data array
  TestValidator.predicate(
    "Should have at least one administrator record",
    response.data.length > 0,
  );
  // Validate first administrator record
  const firstAdmin = response.data[0];
  TestValidator.predicate(
    "First administrator should have a valid ID",
    firstAdmin.id.length > 0,
  );
  TestValidator.predicate(
    "First administrator should have an email",
    firstAdmin.email.length > 0,
  );
  TestValidator.predicate(
    "First administrator should be active (not soft-deleted)",
    firstAdmin.deleted_at === null || firstAdmin.deleted_at === undefined,
  );
}
