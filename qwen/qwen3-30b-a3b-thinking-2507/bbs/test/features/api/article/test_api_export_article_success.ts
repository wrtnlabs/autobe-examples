import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_export_article_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as admin
  const admin: IEconPoliticBoardAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: {} },
  );
  typia.assert(admin);
  // Create export request parameters
  const exportRequest = {
    type: "articles",
    format: "csv",
  } satisfies IEconPoliticBoardArticle.IRequest;
  // Trigger the export operation with admin credentials
  const exportResponse: IEconPoliticBoardArticle.IResponse =
    await api.functional.econPoliticBoard.admin._export.create(
      adminConnection,
      { body: exportRequest },
    );
  // Validate and ensure proper response structure
  typia.assert(exportResponse);
  // Verify that export ID is a valid UUID (36 characters including hyphens)
  TestValidator.equals(
    "export ID is valid UUID",
    exportResponse.exportId.length,
    36,
  );
}
