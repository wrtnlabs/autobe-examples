import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_admin_pending_requests_regular_admin_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Create a regular administrator account (not super)
  const adminEmail = typia.random<string & tags.Format<"email">>() satisfies string as string;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail satisfies string as string,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminJoinOutput);
  // Authenticate as regular administrator
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail satisfies string as string,
      password: adminPassword,
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // Try to access pending-requests endpoint (should fail with 403)
  // This endpoint should only be accessible by super administrators
  await TestValidator.httpError(
    "regular admin should get 403 on pending-requests",
    403,
    async () => {
      await api.functional.economicPoliticalBoard.admin.pending_requests.index(
        adminLoginConnection,
        {
          body: {} satisfies IEconomicPoliticalBoardAdministratorRequest.IRequest,
        },
      );
    },
  );
}