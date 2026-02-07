import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityServiceStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_service_overview_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using base connection host
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function (mandatory)
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Call the overview endpoint using SDK function
  const serviceOverview =
    await api.functional.community.admin.service.overview.at(adminConnection);
  // Validate the response using typia.assert()
  typia.assert(serviceOverview);
}
