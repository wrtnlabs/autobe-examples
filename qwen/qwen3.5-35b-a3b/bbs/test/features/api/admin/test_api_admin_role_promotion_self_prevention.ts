import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_role_promotion_self_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Create authenticated connection for admin with token from join response
  const adminAuthenticatedConnection: api.IConnection = {
    host: connection.host,
  };
  adminAuthenticatedConnection.headers = {
    Authorization: adminJoinResult.token.access,
  };
  // 3. Attempt self-promotion by using the admin's user ID as the roleId
  // The system should reject this attempt as self-promotion is not allowed
  // Note: This tests the business logic constraint that admins cannot promote themselves
  await TestValidator.error(
    "self-promotion to super grade should be rejected",
    async () => {
      await api.functional.economicPoliticalBoard.admin.roles.promote(
        adminAuthenticatedConnection,
        {
          roleId: adminJoinResult.id,
        },
      );
    },
  );
  // 4. Verify the promotion endpoint returned appropriate HTTP error
  // TestValidator.error validates that the API call throws an HttpError
  // which confirms the system properly rejects self-promotion attempts
  // Full state verification (checking grade remains 'super') would require
  // a GET /admin/roles endpoint, which is not available in the current SDK
}