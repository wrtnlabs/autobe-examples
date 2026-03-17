import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_super_administrator_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  const readerConnection: api.IConnection = { host: connection.host };
  const superAdministratorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "requesting unknown super administrator detail returns not found",
    404,
    async () => {
      await api.functional.shoppingMall.superAdministrators.at(
        readerConnection,
        {
          superAdministratorId,
        },
      );
    },
  );
}
