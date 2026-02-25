import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_platform_event_subtypes_authorization_access(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test valid admin access with search parameters
  const validEventId = typia.random<string & tags.Format<"uuid">>();
  const result =
    await api.functional.ecommerce.administrator.platform_events.subtypes.index(
      adminConnection,
      {
        eventId: validEventId,
        body: {
          event_type: "system_startup",
          event_severity: "info",
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(result);
  // Test authorization - non-admin should be denied access
  await TestValidator.error("non-admin access should be denied", async () => {
    const unauthorizedConnection: api.IConnection = { host: connection.host };
    await api.functional.ecommerce.administrator.platform_events.subtypes.index(
      unauthorizedConnection,
      {
        eventId: validEventId,
        body: {
          event_type: "test",
          page: 1,
          limit: 5,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  });
  // Test search filtering functionality with search parameter
  const filteredResult =
    await api.functional.ecommerce.administrator.platform_events.subtypes.index(
      adminConnection,
      {
        eventId: validEventId,
        body: {
          event_source: "integration",
          search: "test",
          page: 1,
          limit: 5,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(filteredResult);
  // Validate pagination structure
  TestValidator.predicate(
    "current page should be non-negative",
    filteredResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be within range",
    filteredResult.pagination.limit >= 1 &&
      filteredResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    filteredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    filteredResult.pagination.pages >= 0,
  );
  // Test date range filtering
  const dateFilteredResult =
    await api.functional.ecommerce.administrator.platform_events.subtypes.index(
      adminConnection,
      {
        eventId: validEventId,
        body: {
          date_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          date_to: new Date().toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(dateFilteredResult);
}
