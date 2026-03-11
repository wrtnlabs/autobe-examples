import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_ban_unban_admin_authentication_required(
  connection: api.IConnection,
): Promise<void> {
  // Generate a ban ID for testing (auth check happens before record validation)
  const banId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 1. Test unauthenticated request - should return 401 Unauthorized
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated request returns 401",
    401,
    async () => {
      await api.functional.economicPoliticalBoard.admin.bans.unban(
        unauthenticatedConnection,
        {
          banId,
          body: {} satisfies IEconomicPoliticalBoardBanRecord.IUnbanRequest,
        },
      );
    },
  );
  // 2. Create member account and test member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Test member authentication - should return 403 Forbidden
  await TestValidator.httpError(
    "member authentication returns 403 Forbidden",
    403,
    async () => {
      await api.functional.economicPoliticalBoard.admin.bans.unban(
        memberConnection,
        {
          banId,
          body: {} satisfies IEconomicPoliticalBoardBanRecord.IUnbanRequest,
        },
      );
    },
  );
  // 3. Create admin account and test admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Test admin authentication - should return 200 OK and return ban record
  const unbanResponse =
    await api.functional.economicPoliticalBoard.admin.bans.unban(
      adminConnection,
      {
        banId,
        body: {} satisfies IEconomicPoliticalBoardBanRecord.IUnbanRequest,
      },
    );
  typia.assert(unbanResponse);
}