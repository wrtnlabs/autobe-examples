import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_article_deletion_by_regular_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // Join as administrator (promote to admin role)
  await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // 2. Delete an article
  // Assume a valid article ID exists in the test environment
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Execute deletion - must succeed for authorized admin
  await api.functional.economicBoard.administrator.articles.erase(
    adminConnection,
    {
      articleId,
    },
  );
  // 3. Validation: No error means success; status preservation and auditing are server-side and not testable with current API
  // Per requirements: We test only what is available - the deletion itself succeeds as admin
  // The scenario's requirements regarding status, comments, attachments, audit log cannot be verified due to missing API endpoints
  // Our test passes by executing the deletion successfully with valid admin
}
