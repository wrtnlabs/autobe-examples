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

export async function test_api_migration_history_pagination_and_timestamp_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Create pagination request parameters
  // Note: The ISummary type has no properties, so we cannot filter by applied_at
  // The scenario requires applied_at filtering, but this property doesn't exist in the DTO definition
  // We'll still test pagination and ensure we get the expected number of records
  const firstPageRequest: ICommunityMigrationHistory.IRequest = {
    limit: 20,
    cursor: null,
  };
  const firstPageResponse =
    await api.functional.community.admin.migration_histories.index(
      adminConnection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(firstPageResponse);
  // 3. Request second page
  const secondPageRequest: ICommunityMigrationHistory.IRequest = {
    limit: 20,
    cursor: firstPageResponse.pagination.current + 1,
  };
  const secondPageResponse =
    await api.functional.community.admin.migration_histories.index(
      adminConnection,
      {
        body: secondPageRequest,
      },
    );
  typia.assert(secondPageResponse);
  // 4. Validation - only what's possible with given DTOs
  // Verify exactly 20 records on page 2
  TestValidator.equals(
    "second page has exactly 20 records",
    secondPageResponse.data.length,
    20,
  );
  // Verify pagination metadata is correct
  TestValidator.equals(
    "pagination limit is 20",
    secondPageResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination current is 2",
    secondPageResponse.pagination.current,
    2,
  );
  // Note: Cannot validate applied_at timestamp range because ISummary has no properties
  // This validation is impossible due to DTO definition mismatch
  // Per AutoBE principles: compilation success > scenario fidelity
}
