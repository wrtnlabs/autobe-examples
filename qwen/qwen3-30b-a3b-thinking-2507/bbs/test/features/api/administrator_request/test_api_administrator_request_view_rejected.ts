import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdministratorRequest";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_request_view_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://example.com",
      referrer: "http://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomyPoliticsBoardAdmin.IJoin,
  });
  // 2. Get the rejected administrator request
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const request =
    await api.functional.economyPoliticsBoard.admin.administrator_requests.at(
      adminConnection,
      {
        requestId,
      },
    );
  typia.assert(request);
  // 3. Validate request details
  TestValidator.equals(
    "status should be 'rejected'",
    request.status,
    "rejected",
  );
  TestValidator.predicate(
    "reason must be at least 10 characters",
    request.reason.length >= 10,
  );
}
