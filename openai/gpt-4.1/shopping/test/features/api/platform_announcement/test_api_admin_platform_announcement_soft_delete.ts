import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPlatformAnnouncement";

/**
 * Validate soft deletion of a platform announcement by admin.
 *
 * 1. Register a new admin account and authenticate
 * 2. Create a new platform announcement
 * 3. Soft-delete (erase) the announcement
 * 4. Confirm the deleted_at timestamp is set
 * 5. Confirm all expected properties for audit remain accessible
 */
export async function test_api_admin_platform_announcement_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register & authenticate as admin
  const adminEmail = RandomGenerator.name(1) + "@company.com";
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail satisfies string as string,
        password: adminPassword satisfies string as string,
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new platform announcement
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    target_audience: "all",
    status: "active",
    publish_start_at: null,
    publish_end_at: null,
  } satisfies IShoppingPlatformAnnouncement.ICreate;
  const announcement: IShoppingPlatformAnnouncement =
    await api.functional.shopping.admin.platformAnnouncements.create(
      connection,
      { body: createBody },
    );
  typia.assert(announcement);

  // 3. Soft-delete (erase) the announcement
  const erased: IShoppingPlatformAnnouncement =
    await api.functional.shopping.admin.platformAnnouncements.erase(
      connection,
      { platformAnnouncementId: announcement.id },
    );
  typia.assert(erased);

  // 4. Confirm the deleted_at timestamp is set (not null, is a proper date-time)
  TestValidator.predicate(
    "deleted_at is set after soft-delete",
    typeof erased.deleted_at === "string" && !!erased.deleted_at,
  );

  // 5. Confirm audit trail properties (id, admin_id, title, status) remain accessible
  TestValidator.equals(
    "id remains after soft-delete",
    erased.id,
    announcement.id,
  );
  TestValidator.equals(
    "admin_id remains for audit",
    erased.admin_id,
    announcement.admin_id,
  );
  TestValidator.equals(
    "title remains for audit",
    erased.title,
    announcement.title,
  );
  TestValidator.equals(
    "status remains for audit",
    erased.status,
    announcement.status,
  );
}
