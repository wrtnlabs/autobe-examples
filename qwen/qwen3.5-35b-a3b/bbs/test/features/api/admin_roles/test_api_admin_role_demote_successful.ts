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

export async function test_api_admin_role_demote_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super administrator (the demoter)
  const demoterConnection: api.IConnection = { host: connection.host };
  const demoterAuth = await authorize_admin_join(demoterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(demoterAuth);
  // 2. Create second super administrator (the demotee)
  const demoteeConnection: api.IConnection = { host: connection.host };
  const demoteeAuth = await authorize_admin_join(demoteeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(demoteeAuth);
  // 3. Execute demote operation (demoter demotes demotee)
  const demoteRequest: IEconomicPoliticalBoardAdministratorRoleDemoteRequest = {
    userId: demoteeAuth.id,
  };
  const response =
    await api.functional.economicPoliticalBoard.admin.roles.demote(
      demoterConnection,
      {
        roleId: demoterAuth.id,
        body: demoteRequest,
      },
    );
  typia.assert(response);
  // 4. Validate grade changed from 'super' to 'regular'
  TestValidator.equals("grade should be regular", response.grade, "regular");
  TestValidator.notEquals("grade should not be super", response.grade, "super");
  // 5. Verify promoted_by_user is set to demoter's ID
  TestValidator.equals(
    "promoted_by_user should be demoter",
    response.promotedByUser?.id,
    demoterAuth.id,
  );
  // 6. Verify updated_at timestamp was refreshed
  TestValidator.notEquals(
    "updated_at should be refreshed",
    response.created_at,
    response.updated_at,
  );
}
