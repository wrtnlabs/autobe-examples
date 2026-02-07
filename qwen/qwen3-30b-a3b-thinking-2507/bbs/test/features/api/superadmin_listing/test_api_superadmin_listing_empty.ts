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

export async function test_api_superadmin_listing_empty(
  connection: api.IConnection,
) {
  const output: IPageIEconomyPoliticsBoardSuperAdmin.ISummary =
    await api.functional.economyPoliticsBoard.superadmins.index(connection, {
      body: typia.random<IEconomyPoliticsBoardSuperAdmin.IRequest>(),
    });
  typia.assert(output);
  TestValidator.equals("data should be empty array", output.data, []);
  TestValidator.equals(
    "pagination records should be 0",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    output.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current should be 1",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be default (20)",
    output.pagination.limit,
    20,
  );
}
