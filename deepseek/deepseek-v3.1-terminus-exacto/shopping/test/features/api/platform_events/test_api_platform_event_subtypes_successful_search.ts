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
 * Test successful retrieval of platform event subtypes with comprehensive filtering.
 */
export async function test_api_platform_event_subtypes_successful_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Retrieve a platform event first to have a valid eventId
  const platformEvents =
    await api.functional.ecommerce.superAdministrator.platform_events.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(platformEvents);
  // Ensure we have at least one event
  TestValidator.predicate(
    "has platform events",
    platformEvents.data.length > 0,
  );
  const parentEvent = platformEvents.data[0];
  // 3. Perform subtype search with comprehensive filtering
  const searchRequest = {
    event_type: "system_startup",
    event_severity: "info",
    event_source: "system",
    date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    date_to: new Date().toISOString(), // current time
    search: "startup",
    page: 1,
    limit: 5,
  } satisfies IEcommercePlatformEvent.IRequest;
  const subtypes =
    await api.functional.ecommerce.superAdministrator.platform_events.subtypes.index(
      superAdminConnection,
      {
        eventId: parentEvent.id,
        body: searchRequest,
      },
    );
  typia.assert(subtypes);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "valid pagination current",
    subtypes.pagination.current >= 1,
  );
  TestValidator.predicate(
    "valid pagination limit",
    subtypes.pagination.limit > 0,
  );
  TestValidator.predicate(
    "valid pagination records",
    subtypes.pagination.records >= 0,
  );
  TestValidator.predicate(
    "valid pagination pages",
    subtypes.pagination.pages >= 0,
  );
  // 5. Validate subtype events structure
  for (const event of subtypes.data) {
    TestValidator.predicate("event has id", typeof event.id === "string");
    TestValidator.predicate(
      "event has type",
      typeof event.event_type === "string",
    );
    TestValidator.predicate(
      "event has severity",
      typeof event.event_severity === "string",
    );
    TestValidator.predicate(
      "event has source",
      typeof event.event_source === "string",
    );
    TestValidator.predicate(
      "event has created_at",
      typeof event.created_at === "string",
    );
  }
  // 6. Validate chronological ordering (newest first)
  if (subtypes.data.length > 1) {
    for (let i = 0; i < subtypes.data.length - 1; i++) {
      const current = new Date(subtypes.data[i].created_at);
      const next = new Date(subtypes.data[i + 1].created_at);
      TestValidator.predicate("events sorted newest first", current >= next);
    }
  }
}
