import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_index_search(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as system administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "password",
    } satisfies ICommunityAdmin.ILogin,
  });
  // Search for administrative accounts by username
  const searchResults = await api.functional.community.admin.admins.index(
    adminConnection,
    {
      body: {
        username: "admin",
        limit: 10,
      } satisfies ICommunityAdmin.IRequest,
    },
  );
  typia.assert(searchResults);
  // Validate search results
  TestValidator.predicate(
    "search results should have at least one item",
    searchResults.data.length > 0,
  );
  TestValidator.equals(
    "pagination records count should match",
    searchResults.pagination.records,
    searchResults.data.length,
  );
}
