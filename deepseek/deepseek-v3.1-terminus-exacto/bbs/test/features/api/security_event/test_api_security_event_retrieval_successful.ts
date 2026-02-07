import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of a security event by an administrator.
 * 1. Create an administrator account
 * 2. Retrieve a security event using its UUID
 * 3. Validate all expected fields and timestamps
 */
export async function test_api_security_event_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register administrator using utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Retrieve a security event using a valid event ID
  // Note: Since we don't have a create security event endpoint available,
  // we'll test retrieval functionality with a properly formatted UUID
  const securityEvent =
    await api.functional.discussionBoard.admin.security_events.at(
      adminConnection,
      {
        eventId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(securityEvent);
  // Validate business logic - the event should have proper structure
  // typia.assert() above already validates all types, so we only test business logic
  TestValidator.predicate(
    "event has valid structure",
    securityEvent.id.length > 0 &&
      securityEvent.event_type.length > 0 &&
      securityEvent.severity.length > 0 &&
      securityEvent.description.length > 0 &&
      securityEvent.source_ip.length > 0 &&
      securityEvent.user_agent.length > 0,
  );
  // Validate timestamp formats are ISO strings
  TestValidator.predicate(
    "created_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(
      securityEvent.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(
      securityEvent.updated_at,
    ),
  );
  // Validate optional resolved_at timestamp when present
  if (securityEvent.resolved_at !== undefined) {
    TestValidator.predicate(
      "resolved_at is ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(
        securityEvent.resolved_at,
      ),
    );
  }
}
