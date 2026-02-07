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

export async function test_api_superadmin_listing_default(
  connection: api.IConnection,
) {
  const output: IPageIEconomyPoliticsBoardSuperAdmin.ISummary =
    await api.functional.economyPoliticsBoard.superadmins.index(connection, {
      body: typia.random<IEconomyPoliticsBoardSuperAdmin.IRequest>(),
    });
  typia.assert(output);
}
