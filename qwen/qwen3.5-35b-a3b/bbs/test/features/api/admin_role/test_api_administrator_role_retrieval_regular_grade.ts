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

export async function test_api_administrator_role_retrieval_regular_grade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin setup - authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminId = (await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  })).id;

  // 2. Regular admin setup - create a regular administrator user
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminId = (await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  })).id;

  // 3. Super admin promotes the regular admin to establish role record
  const promotedRole =
    await api.functional.economicPoliticalBoard.admin.roles.promote(
      superAdminConnection,
      {
        roleId: regularAdminId,
      },
    );
  typia.assert(promotedRole);

  // 4. Retrieve the role details using super admin connection
  const retrievedRole =
    await api.functional.economicPoliticalBoard.admin.roles.at(
      superAdminConnection,
      {
        roleId: regularAdminId,
      },
    );
  typia.assert(retrievedRole);

  // 5. Validate role structure and business logic
  TestValidator.equals("role id is valid UUID", retrievedRole.id.length, 36);
  TestValidator.equals("grade is regular", retrievedRole.grade, "regular");
  TestValidator.equals(
    "user id matches input",
    retrievedRole.user.id,
    regularAdminId,
  );
  TestValidator.equals(
    "user grade matches",
    retrievedRole.user.grade,
    "regular",
  );
  TestValidator.notEquals(
    "user created and updated differ",
    retrievedRole.user.created_at,
    retrievedRole.user.updated_at,
  );
  TestValidator.predicate(
    "promotedByUser exists after promotion",
    retrievedRole.promotedByUser !== null,
  );
  TestValidator.predicate(
    "promoted_at is set after promotion",
    retrievedRole.promoted_at !== null,
  );
  TestValidator.notEquals(
    "role created and updated differ",
    retrievedRole.created_at,
    retrievedRole.updated_at,
  );
}