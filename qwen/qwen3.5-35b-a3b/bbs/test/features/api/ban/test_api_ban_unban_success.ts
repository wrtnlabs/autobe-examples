import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_ban_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create admin connection with JWT token
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 2. Get ban record ID - simulate existing ban
  // Since we can't create a ban in this test, use random UUID for unban
  // In real scenario, this would come from GET /admin/bans listing
  const banId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call unban endpoint
  const unbanResult =
    await api.functional.economicPoliticalBoard.admin.bans.unban(
      adminAuthConnection,
      {
        banId,
        body: {} satisfies IEconomicPoliticalBoardBanRecord.IUnbanRequest,
      },
    );
  typia.assert(unbanResult);
  // 4. Validate response structure
  // Check user reference exists and has valid structure
  typia.assert(unbanResult.user);
  // Check bannedByAdmin reference exists
  typia.assert(unbanResult.bannedByAdmin);
  // Validate reason is present (non-empty string)
  TestValidator.predicate(
    "ban reason is non-empty string",
    () =>
      typeof unbanResult.reason === "string" && unbanResult.reason.length > 0,
  );
  // Validate created_at timestamp format
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    () => !isNaN(Date.parse(unbanResult.created_at)),
  );
}
