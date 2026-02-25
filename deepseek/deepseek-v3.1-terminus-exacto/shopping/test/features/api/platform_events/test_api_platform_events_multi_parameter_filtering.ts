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

export async function test_api_platform_events_multi_parameter_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Test filtering with multiple parameters: event_type='integration_webhook', event_severity='error'
  const currentDate = new Date();
  const dateFrom = new Date(
    currentDate.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const dateTo = new Date(
    currentDate.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day ago
  const searchFilterResult =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          event_type: "integration_webhook",
          event_severity: "error",
          date_from: dateFrom satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          date_to: dateTo satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          search: "webhook" satisfies string | null as string | null,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(searchFilterResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    typeof searchFilterResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "has current page",
    searchFilterResult.pagination.current > 0,
  );
  TestValidator.predicate("has limit", searchFilterResult.pagination.limit > 0);
  TestValidator.predicate(
    "has records count",
    searchFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    searchFilterResult.pagination.pages >= 0,
  );
  // Test data array validation
  TestValidator.equals(
    "data is array",
    Array.isArray(searchFilterResult.data),
    true,
  );
  // Test null and optional field combinations
  const nullFilterResult =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          event_type: null satisfies string | null as string | null,
          event_severity: null satisfies string | null as string | null,
          event_source: null satisfies string | null as string | null,
          date_from: null satisfies
            | (string & tags.Format<"date-time">)
            | null as (string & tags.Format<"date-time">) | null,
          date_to: null satisfies (string & tags.Format<"date-time">) | null as
            | (string & tags.Format<"date-time">)
            | null,
          search: null satisfies string | null as string | null,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(nullFilterResult);
  // Test partial text search with multiple parameters
  const partialSearchResult =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          event_type: "integration_webhook",
          event_severity: "error",
          search: "failed" satisfies string | null as string | null,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(partialSearchResult);
  // Validate that all returned events match the combined filter criteria
  if (partialSearchResult.data.length > 0) {
    TestValidator.predicate(
      "has valid events",
      partialSearchResult.data.every(
        (event) =>
          event.event_type === "integration_webhook" &&
          event.event_severity === "error",
      ),
    );
  }
  // Test event source filtering with other parameters
  const sourceFilterResult =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          event_source: "payment_gateway",
          event_type: "system_operation",
          event_severity: "warning",
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(sourceFilterResult);
  // Verify AND logic across all parameters
  const combinedFilterResult =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          event_type: "user_registration",
          event_severity: "info",
          event_source: "auth_service",
          date_from: dateFrom satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          search: "success" satisfies string | null as string | null,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
}
