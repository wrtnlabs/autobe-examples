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

export async function test_api_administrators_filtered_by_role_type(
  connection: api.IConnection,
): Promise<void> {
  const response = await api.functional.economyPoliticsBoard.admins.index(
    connection,
    {
      body: typia.random<IEconomyPoliticsBoardAdmin.IRequest>(),
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "should have pagination",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "should have data array",
    response.data !== undefined,
  );
  TestValidator.predicate(
    "data array should not be empty",
    response.data.length > 0,
  );
  const firstAdmin = response.data[0];
  TestValidator.predicate("admin should have id", !!firstAdmin.id);
  TestValidator.predicate("admin should have email", !!firstAdmin.email);
  TestValidator.predicate(
    "admin should have created_at",
    !!firstAdmin.created_at,
  );
  TestValidator.predicate(
    "admin should have updated_at",
    !!firstAdmin.updated_at,
  );
}
