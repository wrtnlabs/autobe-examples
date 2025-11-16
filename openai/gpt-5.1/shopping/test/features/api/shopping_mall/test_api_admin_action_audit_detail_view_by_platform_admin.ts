import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionAudit";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_admin_action_audit_detail_view_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator to obtain an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // Basic sanity checks on the authorized admin session
  TestValidator.predicate(
    "platform admin id should be non-empty",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  TestValidator.predicate(
    "platform admin email should be non-empty",
    typeof admin.email === "string" && admin.email.length > 0,
  );
  TestValidator.predicate(
    "platform admin token access should be non-empty",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Call the admin action audit detail endpoint with a UUID.
  const adminActionAuditId = typia.random<string & tags.Format<"uuid">>();

  const audit =
    await api.functional.shoppingMall.platformAdmin.adminActionAudits.at(
      connection,
      { adminActionAuditId },
    );
  typia.assert<IShoppingMallAdminActionAudit>(audit);

  // 3. Validate core fields and business-level expectations.
  TestValidator.predicate(
    "audit id should be non-empty",
    typeof audit.id === "string" && audit.id.length > 0,
  );
  TestValidator.predicate(
    "audit adminId should be non-empty",
    typeof audit.adminId === "string" && audit.adminId.length > 0,
  );
  TestValidator.predicate(
    "audit actionType should be non-empty",
    typeof audit.actionType === "string" && audit.actionType.length > 0,
  );
  TestValidator.predicate(
    "audit resourceType should be non-empty",
    typeof audit.resourceType === "string" && audit.resourceType.length > 0,
  );
  TestValidator.predicate(
    "audit resourceId should be non-empty",
    typeof audit.resourceId === "string" && audit.resourceId.length > 0,
  );
  TestValidator.predicate(
    "audit occurredAt should be non-empty",
    typeof audit.occurredAt === "string" && audit.occurredAt.length > 0,
  );
  TestValidator.predicate(
    "audit createdAt should be non-empty",
    typeof audit.createdAt === "string" && audit.createdAt.length > 0,
  );
  TestValidator.predicate(
    "audit resultStatus should be non-empty",
    typeof audit.resultStatus === "string" && audit.resultStatus.length > 0,
  );

  // Optional descriptive fields should either be undefined or, if present,
  // be non-empty strings to provide meaningful investigative context.
  if (audit.summary !== undefined) {
    TestValidator.predicate(
      "audit summary, when present, should be non-empty",
      audit.summary === undefined ||
        (typeof audit.summary === "string" && audit.summary.length > 0),
    );
  }

  if (audit.metadata !== undefined) {
    TestValidator.predicate(
      "audit metadata, when present, should be non-empty",
      audit.metadata === undefined ||
        (typeof audit.metadata === "string" && audit.metadata.length > 0),
    );
  }
}
