import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticBoardSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_config_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {},
  });
  const defaultResponse =
    await api.functional.econPoliticBoard.admin.systemConfigs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  TestValidator.equals(
    "default page should start at 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "default response has data",
    defaultResponse.data.length > 0,
  );
  const specificResponse =
    await api.functional.econPoliticBoard.admin.systemConfigs.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        },
      },
    );
  TestValidator.equals(
    "specific page should be 2",
    specificResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "specific limit should be 5",
    specificResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "specific response should have 5 items",
    specificResponse.data.length,
    5,
  );
}
