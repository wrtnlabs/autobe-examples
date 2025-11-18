import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_actor_security_event_deletion_cooperates_with_audit_logging(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const actingAdminId: (string & tags.Format<"uuid">) | null =
    adminAuthorized.admin?.id ?? null;

  // 2. Create an actor security event with distinctive attributes
  const eventCreateBody = {
    actor_type: "admin",
    event_type: "TEST_SECURITY_EVENT_DELETION",
    ip: "127.0.0.1",
    user_agent: "E2E-Test-Agent/1.0",
    metadata: '{"purpose":"actor_security_event_deletion_audit_e2e"}',
  } satisfies IShoppingMallActorSecurityEvent.ICreate;

  const createdEvent: IShoppingMallActorSecurityEvent =
    await api.functional.shoppingMall.admin.actorSecurityEvents.create(
      connection,
      {
        body: eventCreateBody,
      },
    );
  typia.assert<IShoppingMallActorSecurityEvent>(createdEvent);

  const securityEventId: string & tags.Format<"uuid"> = createdEvent.id;

  // 3. Delete the created actor security event
  await api.functional.shoppingMall.admin.actorSecurityEvents.erase(
    connection,
    {
      securityEventId,
    },
  );

  // 4. Query the admin audit logs looking for a deletion entry
  const auditSearchRequest = {
    shopping_mall_admin_id: actingAdminId,
    action_type: null,
    entity_type: null,
    entity_id: securityEventId,
    request_id: null,
    ip: null,
    user_agent: null,
    message: null,
    from_created_at: null,
    to_created_at: null,
    page: 1,
    limit: 50,
  } satisfies IShoppingMallAdminAuditLog.IRequest;

  const auditPage: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: auditSearchRequest,
    });
  typia.assert<IPageIShoppingMallAdminAuditLog.ISummary>(auditPage);

  // 5. Business assertions: at least one audit log referencing this deletion
  const logs = auditPage.data;

  await TestValidator.predicate(
    "there should be at least one admin audit log entry after deleting security event",
    async () => logs.length > 0,
  );

  const hasMatchingEntityId = logs.some(
    (log) => log.entity_id === securityEventId,
  );
  TestValidator.predicate(
    "there should be an audit log whose entity_id equals the deleted security event id",
    hasMatchingEntityId,
  );

  if (actingAdminId !== null) {
    const hasMatchingAdminId = logs.some(
      (log) => log.shopping_mall_admin_id === actingAdminId,
    );
    TestValidator.predicate(
      "there should be an audit log recorded under the acting admin id when available",
      hasMatchingAdminId,
    );
  }
}
