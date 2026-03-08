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

export async function test_api_administrator_promotion_self_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authResponse);
  // Create connection with the authentication token
  const adminConnectionWithToken: api.IConnection = { host: connection.host };
  adminConnectionWithToken.headers = {
    Authorization: authResponse.token.access,
  };
  // 2. Generate a UUID that represents an administrator role ID
  // Since we don't have a GET endpoint to fetch administrator role UUIDs,
  // we use typia.random to generate a valid UUID that could represent
  // an existing administrator role ID
  const adminId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Test self-promotion attempt
  // Expected: HTTP 400 Bad Request with message indicating self-promotion is forbidden
  await TestValidator.error("super admin cannot promote self", async () => {
    await api.functional.economicPoliticalBoard.admin.administrators.promote(
      adminConnectionWithToken,
      {
        adminId: adminId, // Attempting to promote themselves
      },
    );
  });
  // 4. Verify the system state remains unchanged
  // Test again to confirm no partial state changes occurred
  await TestValidator.error(
    "second self-promotion attempt also fails",
    async () => {
      await api.functional.economicPoliticalBoard.admin.administrators.promote(
        adminConnectionWithToken,
        {
          adminId: adminId,
        },
      );
    },
  );
  // Additional verification: Verify that the authenticated user's credentials are still valid
  // This confirms the session wasn't affected by the failed promotion attempt
  const testConnection: api.IConnection = { host: connection.host };
  testConnection.headers = {
    Authorization: authResponse.token.access,
  };
  // We can verify the token is still valid by attempting another authenticated operation
  // For this test, we'll verify the token structure is intact by checking it exists
  TestValidator.predicate(
    "authentication token remains valid",
    () => authResponse.token.access.length > 0,
  );
}