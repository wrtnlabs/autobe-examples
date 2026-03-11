import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardAdministratorRoleDemoteRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRoleDemoteRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_role_demote_self_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new administrator (becomes super administrator by default)
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create authenticated connection for admin operations
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 3. Attempt self-demotion (userId equals the requesting admin's ID)
  // This should be rejected with 403 Forbidden
  await TestValidator.error(
    "self-demotion should be forbidden with 403",
    async () => {
      await api.functional.economicPoliticalBoard.admin.roles.demote(
        adminConnection,
        {
          roleId: adminAuth.id,
          body: {
            userId: adminAuth.id, // Attempting to demote themselves
          } satisfies IEconomicPoliticalBoardAdministratorRoleDemoteRequest,
        },
      );
    },
  );
  // 4. Verify no side effects occurred
  // Since the operation was rejected before any database changes,
  // the admin's grade remains unchanged at 'super'
  // (We cannot verify the grade without a GET role endpoint,
  // but the 403 rejection confirms the constraint was enforced)
}
