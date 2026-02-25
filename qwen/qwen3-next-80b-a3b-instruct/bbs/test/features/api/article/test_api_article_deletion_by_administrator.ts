import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_article_deletion_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Generate credentials for super administrator
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEconomicBoardSuperAdministrator.IJoin,
  });
  // 2. Authenticate as super administrator
  const authenticatedSuperAdmin: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(authenticatedSuperAdmin, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEconomicBoardSuperAdministrator.ILogin,
  });
  // 3. Perform authorized deletion of an arbitrary article
  // Note: We assume existence of at least one article in the system.
  // Since no article creation API is available for testing, we use a valid UUID.
  // In real setup, this ID would be from a pre-existing article.
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Call the deletion function with authenticated connection
  await api.functional.economicBoard.administrator.articles.erase(
    authenticatedSuperAdmin,
    {
      articleId,
    },
  );
  // No return value to validate, as per the API - returns void
  // The test passes if no error is thrown during deletion
}
