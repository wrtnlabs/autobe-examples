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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_security_event_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Retrieve a specific security event
  const securityEvent =
    await api.functional.discussionBoard.superAdmin.security_events.at(
      superAdminConnection,
      {
        eventId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(securityEvent);
  // Validate business logic - security event should have valid timestamps
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    new Date(securityEvent.created_at) <= new Date(securityEvent.updated_at),
  );
  // Validate resolved status consistency
  if (securityEvent.resolved) {
    TestValidator.predicate(
      "resolved event has resolved_at timestamp",
      securityEvent.resolved_at !== undefined,
    );
    TestValidator.predicate(
      "resolved event has resolved_by name",
      securityEvent.resolved_by !== undefined,
    );
  } else {
    TestValidator.predicate(
      "unresolved event has no resolved_at timestamp",
      securityEvent.resolved_at === undefined,
    );
    TestValidator.predicate(
      "unresolved event has no resolved_by name",
      securityEvent.resolved_by === undefined,
    );
  }
  // Validate actor relationships consistency
  const actorCount = [
    securityEvent.user,
    securityEvent.admin,
    securityEvent.superAdmin,
  ].filter((actor) => actor !== undefined).length;
  TestValidator.predicate(
    "security event has at most one actor",
    actorCount <= 1,
  );
}
