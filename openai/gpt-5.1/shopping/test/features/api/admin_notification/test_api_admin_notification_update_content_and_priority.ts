import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminNotification";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

export async function test_api_admin_notification_update_content_and_priority(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authenticated context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Admin#1234" as string & tags.Format<"password">,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  const adminId = adminAuthorized.id;

  // 2. Create baseline notification
  const initialTitle = "Refund case requires initial review";
  const initialBody = RandomGenerator.paragraph({ sentences: 8 });

  const createBody = {
    shopping_mall_admin_id: adminId,
    type: "refund_review",
    title: initialTitle,
    body: initialBody,
    status: "unread",
    priority: "normal",
    related_risk_case_id: null,
    related_legal_hold_id: null,
    entity_type: null,
    entity_id: null,
    entity_display: null,
    read_at: null,
    archived_at: null,
  } satisfies IShoppingMallAdminNotification.ICreate;

  const created: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Sanity checks on creation
  TestValidator.equals(
    "created notification admin id matches join admin id",
    created.admin?.id ?? null,
    adminId,
  );
  TestValidator.equals(
    "created notification type is refund_review",
    created.type,
    createBody.type,
  );
  TestValidator.equals(
    "created notification status is unread",
    created.status,
    createBody.status,
  );
  TestValidator.equals(
    "created notification priority is normal",
    created.priority ?? null,
    createBody.priority,
  );

  const originalId = created.id;
  const originalType = created.type;
  const originalStatus = created.status;
  const originalPriority = created.priority ?? null;
  const originalTitle = created.title;
  const originalBody = created.body ?? null;
  const originalReadAt = created.read_at ?? null;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // 3. Update content and priority only
  const updatedTitle = "Refund case escalated";
  const updatedBody = RandomGenerator.content({ paragraphs: 2 });
  const updatedPriority = "high";

  const updateBody = {
    title: updatedTitle,
    body: updatedBody,
    priority: updatedPriority,
  } satisfies IShoppingMallAdminNotification.IUpdate;

  const updated: IShoppingMallAdminNotification =
    await api.functional.shoppingMall.admin.adminNotifications.update(
      connection,
      {
        adminNotificationId: originalId,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate immutable/unchanged fields
  TestValidator.equals(
    "notification id remains the same after update",
    updated.id,
    originalId,
  );

  TestValidator.equals(
    "admin association remains the same after update",
    updated.admin?.id ?? null,
    created.admin?.id ?? null,
  );

  TestValidator.equals(
    "type remains unchanged after update",
    updated.type,
    originalType,
  );

  TestValidator.equals(
    "status remains unread after content update",
    updated.status,
    originalStatus,
  );

  TestValidator.equals(
    "read_at remains null when status not changed",
    updated.read_at ?? null,
    originalReadAt,
  );

  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at is advanced after update",
    updated.updated_at,
    originalUpdatedAt,
  );

  // 5. Validate changed fields
  TestValidator.equals("title is updated", updated.title, updatedTitle);

  TestValidator.equals("body is updated", updated.body ?? null, updatedBody);

  TestValidator.equals(
    "priority changed from normal to high",
    updated.priority ?? null,
    updatedPriority,
  );

  // 6. Optional: associations remain unchanged
  TestValidator.equals(
    "relatedRiskCase remains unchanged",
    updated.relatedRiskCase ?? null,
    created.relatedRiskCase ?? null,
  );

  TestValidator.equals(
    "relatedLegalHold remains unchanged",
    updated.relatedLegalHold ?? null,
    created.relatedLegalHold ?? null,
  );

  TestValidator.equals(
    "entity_type remains unchanged",
    updated.entity_type ?? null,
    created.entity_type ?? null,
  );

  TestValidator.equals(
    "entity_id remains unchanged",
    updated.entity_id ?? null,
    created.entity_id ?? null,
  );

  TestValidator.equals(
    "entity_display remains unchanged",
    updated.entity_display ?? null,
    created.entity_display ?? null,
  );
}
