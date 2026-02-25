import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_admin_promote_citizen_to_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
      },
    },
  );
  typia.assert(superAdmin);
  // 2. Register citizen
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenPassword = RandomGenerator.alphaNumeric(16);
  const citizenDisplayName = RandomGenerator.name();
  const citizenBio = RandomGenerator.paragraph({ sentences: 1 });
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: citizenEmail,
      password: citizenPassword,
      display_name: citizenDisplayName,
      bio: citizenBio,
    },
  });
  typia.assert(citizen);
  // 3. Authenticate as super administrator
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminLoginConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    },
  });
  // 4. Authenticate as citizen to get their user ID
  const citizenLoginConnection: api.IConnection = { host: connection.host };
  const citizenLogin = await authorize_citizen_login(citizenLoginConnection, {
    body: {
      email: citizenEmail,
      password: citizenPassword,
    },
  });
  typia.assert(citizenLogin);
  // 5. Promote citizen to administrator using their ID
  const promoted =
    await api.functional.economicBoard.superAdministrator.admin.users.promote.promoteToAdmin(
      superAdminLoginConnection,
      {
        userId: citizenLogin.id,
      },
    );
  typia.assert(promoted);
  // 6. Validate promoted user properties (only those existing in IEconomicBoardCitizen)
  TestValidator.equals(
    "promoted user id matches",
    promoted.id,
    citizenLogin.id,
  );
  TestValidator.equals(
    "promoted email unchanged",
    promoted.email,
    citizenLogin.email,
  );
  TestValidator.equals(
    "promoted display_name unchanged",
    promoted.display_name,
    citizenDisplayName,
  );
  TestValidator.equals("promoted bio unchanged", promoted.bio, citizenBio);
  TestValidator.equals(
    "promoted is_banned unchanged",
    promoted.is_banned,
    citizenLogin.is_banned,
  );
  TestValidator.equals(
    "promoted ban_reason unchanged",
    promoted.ban_reason,
    citizenLogin.ban_reason,
  );
  TestValidator.equals(
    "promoted created_at unchanged",
    promoted.created_at,
    citizenLogin.created_at,
  );
  TestValidator.equals(
    "promoted updated_at unchanged",
    promoted.updated_at,
    citizenLogin.updated_at,
  );
  TestValidator.equals(
    "promoted article_count unchanged",
    promoted.article_count,
    citizenLogin.article_count,
  );
  TestValidator.equals(
    "promoted comment_count unchanged",
    promoted.comment_count,
    citizenLogin.comment_count,
  );
  // Note: is_admin, is_super_admin, and role properties do NOT exist in IEconomicBoardCitizen per provided DTO
  // Therefore, they cannot be validated and must be omitted to avoid compilation errors.
}
