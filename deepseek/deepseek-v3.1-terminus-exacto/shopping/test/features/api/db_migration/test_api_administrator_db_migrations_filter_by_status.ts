import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceDbMigration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_db_migrations_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test filtering by 'completed' status
  const completedResponse =
    await api.functional.ecommerce.administrator.db_migrations.index(
      adminConnection,
      {
        body: {
          execution_status: "completed",
          page: 1,
          limit: 10,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(completedResponse);
  // Validate that all results have 'completed' status
  completedResponse.data.forEach((migration) => {
    TestValidator.equals(
      "migration status should be completed",
      migration.execution_status,
      "completed",
    );
  });
  // Test filtering by 'failed' status
  const failedResponse =
    await api.functional.ecommerce.administrator.db_migrations.index(
      adminConnection,
      {
        body: {
          execution_status: "failed",
          page: 1,
          limit: 10,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(failedResponse);
  // Validate that all results have 'failed' status
  failedResponse.data.forEach((migration) => {
    TestValidator.equals(
      "migration status should be failed",
      migration.execution_status,
      "failed",
    );
  });
  // Test filtering by 'pending' status
  const pendingResponse =
    await api.functional.ecommerce.administrator.db_migrations.index(
      adminConnection,
      {
        body: {
          execution_status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Validate that all results have 'pending' status
  pendingResponse.data.forEach((migration) => {
    TestValidator.equals(
      "migration status should be pending",
      migration.execution_status,
      "pending",
    );
  });
  // Test pagination with status filter
  const paginatedResponse =
    await api.functional.ecommerce.administrator.db_migrations.index(
      adminConnection,
      {
        body: {
          execution_status: "completed",
          page: 1,
          limit: 5,
        } satisfies IEcommerceDbMigration.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "paginated result should have valid limit",
    paginatedResponse.pagination.limit <= 5,
  );
  TestValidator.predicate(
    "paginated result should have reasonable record count",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "paginated result should have valid page count",
    paginatedResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "paginated result should have current page",
    paginatedResponse.pagination.current >= 1,
  );
  // Validate all paginated results have correct status
  paginatedResponse.data.forEach((migration) => {
    TestValidator.equals(
      "paginated migration status should match filter",
      migration.execution_status,
      "completed",
    );
  });
}
