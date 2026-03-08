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

export async function test_api_administrator_request_retrieval_by_regular_admin_fails(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<
    string & tags.Format<"email">
  >() satisfies string as string & tags.Format<"email">;
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "1234",
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a regular admin user (not super admin)
  const regularAdminEmail = typia.random<
    string & tags.Format<"email">
  >() satisfies string as string &
    tags.MinLength<1> &
    tags.MaxLength<255> &
    tags.Format<"email">;
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: regularAdminEmail,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 3. Login as the regular admin to get a fresh connection with proper headers
  const regularAdminLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_admin_login(regularAdminLoginConnection, {
    body: {
      email: regularAdminEmail,
      password: "1234",
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // 4. Try to retrieve an administrator request using the regular admin
  // This should fail with 403 Forbidden because regular admins cannot access admin requests
  // Only super admins have this privilege per section 269
  const testRequestId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "regular admin cannot retrieve administrator requests",
    async () => {
      await api.functional.economicPoliticalBoard.admin.administrator_requests.at(
        regularAdminLoginConnection,
        {
          requestId: testRequestId,
        },
      );
    },
  );
}
