import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test platform events filtering by event type functionality.
 * Authenticates as super administrator, filters events by specific type,
 * and validates that only matching events are returned with proper metadata.
 */
export async function test_api_platform_events_filter_by_event_type(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/test",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Define specific event type to filter
  const targetEventType = "system_operations";
  // Retrieve platform events filtered by event type
  const response =
    await api.functional.ecommerce.superAdministrator.platform_events.index(
      superAdminConnection,
      {
        body: {
          event_type: targetEventType,
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  // Validate the response structure
  typia.assert(response);
  // Business logic validation: all events should match the filtered type
  TestValidator.predicate(
    "all events match filtered event type",
    response.data.every((event) => event.event_type === targetEventType),
  );
  // Business validation: pagination should reflect filtered results
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "data array matches page size",
      response.data.length > 0 &&
        response.data.length <= response.pagination.limit,
    );
  }
}
