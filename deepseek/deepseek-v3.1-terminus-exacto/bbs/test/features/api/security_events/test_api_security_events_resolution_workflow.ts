import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_security_events_resolution_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Retrieve unresolved security events with high severity
  const highSeverityEvents =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          resolved: false,
          severity: "high" as const,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(highSeverityEvents);
  // Test 2: Retrieve unresolved security events with critical severity
  const criticalSeverityEvents =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          resolved: false,
          severity: "critical" as const,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(criticalSeverityEvents);
  // Validate high severity events
  if (highSeverityEvents.data.length > 0) {
    TestValidator.predicate(
      "high severity events should be unresolved",
      highSeverityEvents.data.every((event) => event.resolved === false),
    );
    TestValidator.predicate(
      "high severity events should have null resolved_at",
      highSeverityEvents.data.every((event) => event.resolved_at === null),
    );
    TestValidator.predicate(
      "high severity events should have high severity",
      highSeverityEvents.data.every((event) => event.severity === "high"),
    );
  }
  // Validate critical severity events
  if (criticalSeverityEvents.data.length > 0) {
    TestValidator.predicate(
      "critical severity events should be unresolved",
      criticalSeverityEvents.data.every((event) => event.resolved === false),
    );
    TestValidator.predicate(
      "critical severity events should have null resolved_at",
      criticalSeverityEvents.data.every((event) => event.resolved_at === null),
    );
    TestValidator.predicate(
      "critical severity events should have critical severity",
      criticalSeverityEvents.data.every(
        (event) => event.severity === "critical",
      ),
    );
  }
  // Validate pagination metadata for both requests
  TestValidator.predicate(
    "high severity pagination current page should be 1",
    highSeverityEvents.pagination.current === 1,
  );
  TestValidator.predicate(
    "high severity pagination limit should be 10",
    highSeverityEvents.pagination.limit === 10,
  );
  TestValidator.predicate(
    "critical severity pagination current page should be 1",
    criticalSeverityEvents.pagination.current === 1,
  );
  TestValidator.predicate(
    "critical severity pagination limit should be 10",
    criticalSeverityEvents.pagination.limit === 10,
  );
  // Additional validation: Test that the system correctly distinguishes resolution status
  // by testing a resolved events query for comparison
  const resolvedEvents =
    await api.functional.discussionBoard.superAdmin.security_events.index(
      superAdminConnection,
      {
        body: {
          resolved: true,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(resolvedEvents);
  if (resolvedEvents.data.length > 0) {
    TestValidator.predicate(
      "resolved events should have resolved true",
      resolvedEvents.data.every((event) => event.resolved === true),
    );
    TestValidator.predicate(
      "resolved events should have non-null resolved_at",
      resolvedEvents.data.every((event) => event.resolved_at !== null),
    );
  }
}
