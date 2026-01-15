import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardConfig";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_config_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create fresh admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: "AdminPassword123!",
      href: '/', // Add missing property
      referrer: 'localhost', // Add missing property
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 3. Call search endpoint with default parameters
  const response = await api.functional.discussionBoard.admin.configs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardConfig.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals(
    "response pagination should match",
    response.pagination,
    {
      current: 1,
      limit: 20,
      records: response.pagination.records,
      pages: response.pagination.pages,
    },
  );
  // 5. Validate configuration data
  TestValidator.predicate( // Fixed: replaced assert with predicate
    "at least one configuration should exist",
    () => response.data.length > 0,
  );
  // 6. Ensure sensitive values are redacted
  for (const config of response.data) {
    TestValidator.predicate(
      `value should be redacted for ${config.key}`,
      config.value.includes("********"),
    );
  }
}