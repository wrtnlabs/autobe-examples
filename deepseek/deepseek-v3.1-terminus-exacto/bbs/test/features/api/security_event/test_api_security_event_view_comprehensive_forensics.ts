import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test retrieval of resolved security event with comprehensive forensic data.
 * 1. Establish super administrator authentication
 * 2. Retrieve a specific security event
 * 3. Validate complete forensic data and resolution details
 */
export async function test_api_security_event_view_comprehensive_forensics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Retrieve a specific security event (assuming one exists in test data)
  const securityEventId = typia.random<string & tags.Format<"uuid">>();
  const securityEvent =
    await api.functional.discussionBoard.superAdmin.security_events.at(
      superAdminConnection,
      { securityEventId },
    );
  typia.assert(securityEvent);
  // 3. Validate comprehensive forensic data fields using TestValidator only
  TestValidator.predicate(
    "security event has valid ID",
    securityEvent.id.length > 0,
  );
  TestValidator.predicate(
    "has valid event type",
    securityEvent.event_type.length > 0,
  );
  TestValidator.predicate(
    "has valid severity level",
    securityEvent.severity.length > 0,
  );
  TestValidator.predicate(
    "has description",
    securityEvent.description.length > 0,
  );
  TestValidator.predicate(
    "has user agent",
    securityEvent.user_agent.length > 0,
  );
  // 4. Validate resolution details for resolved events (business logic)
  if (securityEvent.resolved) {
    TestValidator.predicate(
      "resolved_at timestamp exists",
      securityEvent.resolved_at !== null,
    );
    TestValidator.predicate(
      "resolved_by administrator exists",
      securityEvent.resolved_by !== null &&
        securityEvent.resolved_by.length > 0,
    );
  }
  // 5. Validate actor links (user, admin, superAdmin) - business logic
  TestValidator.predicate(
    "has valid actor reference structure",
    securityEvent.user !== null ||
      securityEvent.admin !== null ||
      securityEvent.superAdmin !== null,
  );
}
