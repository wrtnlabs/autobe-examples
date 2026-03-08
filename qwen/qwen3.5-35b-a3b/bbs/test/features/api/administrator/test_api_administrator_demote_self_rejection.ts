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

export async function test_api_administrator_demote_self_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.assert<string>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.assert<string>(typia.random<string & tags.Format<"uri">>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string>()),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Extract adminId from the joined response
  const adminId = joinResponse.id;
  // 3. Attempt to demote self (super admin trying to demote themselves)
  const demoteConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "self-demotion should be rejected",
    [403, 409],
    async () => {
      await api.functional.economicPoliticalBoard.admin.administrators.demote(
        demoteConnection,
        {
          adminId,
        },
      );
    },
  );
  // 4. Verify admin can still perform super admin operations after failed self-demotion
  // This confirms the admin's grade remained 'super'
  const superAdminConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "admin can still demote others after failed self-demotion",
    404,
    async () => {
      await api.functional.economicPoliticalBoard.admin.administrators.demote(
        superAdminConnection,
        {
          adminId: typia.assert<string & tags.Format<"uuid">>(typia.random<string>()),
        },
      );
    },
  );
}