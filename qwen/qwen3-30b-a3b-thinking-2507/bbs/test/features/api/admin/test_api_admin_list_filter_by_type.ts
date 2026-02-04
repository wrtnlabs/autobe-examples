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

export async function test_api_admin_list_filter_by_type(
  connection: api.IConnection,
) {
  const result = await api.functional.econPoliticBoard.admins.index(
    connection,
    {
      body: {
        adminType: "regular",
        page: 1,
        limit: 20,
      } satisfies IEconPoliticBoardAdmin.IRequest,
    },
  );
  typia.assert(result);
  for (const admin of result.data) {
    TestValidator.equals("admin role should be 'admin'", admin.role, "admin");
  }
  TestValidator.predicate(
    "should have at least one admin",
    result.data.length > 0,
  );
}
