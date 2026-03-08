import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_role_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin user and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string &
        tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string &
        tags.Format<"uri">,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Use adminConnection for authenticated API calls (already has token from authorize_admin_join)
  // 3. Test retrieval of non-existent administrator role
  // Use a UUID that definitely doesn't exist in the database
  const fakeRoleId = "00000000-0000-0000-0000-000000000000";
  // 4. Verify 404 Not Found error is returned
  await TestValidator.httpError(
    "non-existent role returns 404",
    404,
    async () => {
      await api.functional.economicPoliticalBoard.admin.administrator_roles.at(
        adminConnection,
        {
          roleId: fakeRoleId,
        },
      );
    },
  );
}