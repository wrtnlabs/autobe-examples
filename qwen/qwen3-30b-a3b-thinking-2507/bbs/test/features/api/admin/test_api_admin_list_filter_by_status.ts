import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Verify active admin list returns only active admins
  const activeResponse = await api.functional.econPoliticBoard.admins.index(
    connection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(activeResponse);
  // Verify the result contains at least one active admin
  const activeAdminItems = activeResponse.data.filter(
    (a) => a.status === "active",
  );
  TestValidator.equals(
    "Active admin list should include at least one active admin",
    activeAdminItems.length,
    1,
  );
}
