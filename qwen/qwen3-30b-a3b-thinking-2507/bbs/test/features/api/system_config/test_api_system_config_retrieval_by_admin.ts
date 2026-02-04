import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_config_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IEconPoliticBoardAdmin.IJoin>(),
  });
  const configId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const systemConfig: IEconPoliticBoardSystemConfig =
    await api.functional.econPoliticBoard.admin.systemConfigs.at(
      adminConnection,
      {
        id: configId,
      },
    );
  typia.assert(systemConfig);
}
