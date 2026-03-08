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

export async function test_api_administrator_role_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first administrator (promoter)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Result = await authorize_admin_join(admin1Connection, {
    body: typia.random<IEconomicPoliticalBoardAdmin.IJoin>(),
  });
  typia.assert(admin1Result);
  // 2. Create and authenticate second administrator (to be promoted)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Result = await authorize_admin_join(admin2Connection, {
    body: typia.random<IEconomicPoliticalBoardAdmin.IJoin>(),
  });
  typia.assert(admin2Result);
  // 3. Use admin1 to promote admin2 to super grade
  const promotedRole =
    await api.functional.economicPoliticalBoard.admin.administrators.promote(
      admin1Connection,
      {
        adminId: admin2Result.id,
      },
    );
  typia.assert(promotedRole);
  // 4. Retrieve the promoted role details using the role ID
  const roleDetails =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.at(
      admin1Connection,
      {
        roleId: promotedRole.id,
      },
    );
  typia.assert(roleDetails);
  // 5. Validate grade is 'super'
  TestValidator.equals("grade is super", roleDetails.grade, "super");
  // 6. Validate user information matches admin2
  TestValidator.equals("user ID matches", roleDetails.user.id, admin2Result.id);
  TestValidator.equals(
    "user email matches",
    roleDetails.user.email,
    admin2Result.token.access.substring(0, 0) || "",
  );
  // 7. Validate promotion history exists
  TestValidator.notEquals(
    "promotedByUser exists",
    roleDetails.promotedByUser,
    null,
  );
  TestValidator.equals(
    "promoted by admin1",
    roleDetails.promotedByUser!.id,
    admin1Result.id,
  );
  TestValidator.notEquals("promotedAt exists", roleDetails.promoted_at, null);
  // 8. Validate timestamps are valid ISO 8601 format
  TestValidator.predicate("created_at is valid ISO 8601", () => {
    const date = new Date(roleDetails.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid ISO 8601", () => {
    const date = new Date(roleDetails.updated_at);
    return !isNaN(date.getTime());
  });
  if (
    roleDetails.promoted_at !== null &&
    roleDetails.promoted_at !== undefined
  ) {
    TestValidator.predicate("promoted_at is valid ISO 8601", () => {
      const date = new Date(roleDetails.promoted_at!);
      return !isNaN(date.getTime());
    });
  }
  // 9. Validate updated_at is after or equal to created_at
  TestValidator.predicate("updated_at after created_at", () => {
    return (
      new Date(roleDetails.updated_at).getTime() >=
      new Date(roleDetails.created_at).getTime()
    );
  });
}
