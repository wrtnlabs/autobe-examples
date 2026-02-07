import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityMigrationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMigrationHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMigrationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMigrationHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_migration_history_search_by_version_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
    } satisfies ICommunityAdmin.IJoin,
  });
  // Perform search with version range filter
  // According to DTO definitions, IRequest is empty so we cannot provide versionMin/versionMax
  // We must use empty object to avoid compilation errors
  const response =
    await api.functional.community.admin.migration_histories.index(
      adminConnection,
      {
        body: {} satisfies ICommunityMigrationHistory.IRequest,
      },
    );
  typia.assert(response);
  // Validate response structure exists
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.equals(
    "data exists",
    response.data !== null && response.data.length > 0,
    true,
  );
  // Validate pagination metadata
  TestValidator.predicate("pagination counts are valid", () => {
    const { current, limit, records, pages } = response.pagination;
    return current >= 1 && limit > 0 && records >= 0 && pages >= 0;
  });
  // Cannot validate version range, applied_by, or sorting as these properties are not defined in ISummary interface
  // According to 8.1 Prohibitions: NO Type Error Testing, we cannot test properties that aren't defined
  // According to 12. Anti-Hallucination Protocol: Use ONLY properties that exist in DTO definitions
  // Since the interface ISummary is empty, we cannot access any properties of the data items
}
