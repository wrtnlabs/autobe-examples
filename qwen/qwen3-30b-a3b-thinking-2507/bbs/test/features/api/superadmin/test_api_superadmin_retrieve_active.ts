import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_superadmin_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  const superAdminId = typia.random<string & tags.Format<"uuid">>();
  const account = await api.functional.economyPoliticsBoard.superadmins.at(
    connection,
    {
      superAdminId,
    },
  );
  typia.assert(account);
  TestValidator.equals(
    "Account should be active (deleted_at is null)",
    account.deleted_at,
    null,
  );
}
