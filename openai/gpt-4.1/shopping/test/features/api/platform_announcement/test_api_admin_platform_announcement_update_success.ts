import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPlatformAnnouncement";

/**
 * Validate the admin platform announcement update lifecycle.
 *
 * 1. Register a new admin account and authenticate.
 * 2. Create a platform announcement for context setup.
 * 3. Update the announcement's content, audience, timing, and status as admin.
 * 4. Verify the update is successful and all changes persist, including audit
 *    fields.
 */
export async function test_api_admin_platform_announcement_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "suspended",
      "pending",
      "locked",
    ] as const),
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminJoinBody.email);
  TestValidator.equals("admin name matches", admin.name, adminJoinBody.name);
  TestValidator.equals("admin role matches", admin.role, adminJoinBody.role);
  TestValidator.equals(
    "admin status matches",
    admin.status,
    adminJoinBody.status,
  );

  // 2. Create a platform announcement as the new admin
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    target_audience: RandomGenerator.pick([
      "all",
      "customers",
      "sellers",
      "admins",
    ] as const),
    status: RandomGenerator.pick([
      "draft",
      "scheduled",
      "active",
      "hidden",
    ] as const),
    publish_start_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
    publish_end_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours from now
  } satisfies IShoppingPlatformAnnouncement.ICreate;
  const created: IShoppingPlatformAnnouncement =
    await api.functional.shopping.admin.platformAnnouncements.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);
  TestValidator.equals(
    "announcement title matches",
    created.title,
    createBody.title,
  );
  TestValidator.equals(
    "announcement body matches",
    created.body,
    createBody.body,
  );
  TestValidator.equals(
    "announcement audience matches",
    created.target_audience,
    createBody.target_audience,
  );
  TestValidator.equals(
    "announcement status matches",
    created.status,
    createBody.status,
  );
  TestValidator.equals(
    "announcement publish_start_at",
    created.publish_start_at,
    createBody.publish_start_at,
  );
  TestValidator.equals(
    "announcement publish_end_at",
    created.publish_end_at,
    createBody.publish_end_at,
  );
  TestValidator.equals("announcement admin_id", created.admin_id, admin.id);

  // 3. Prepare a new update (change all mutable fields)
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedBody = RandomGenerator.content({ paragraphs: 3 });
  const updatedAudience = RandomGenerator.pick([
    "all",
    "customers",
    "sellers",
    "admins",
  ] as const);
  const updatedStatus = RandomGenerator.pick([
    "scheduled",
    "active",
    "expired",
    "draft",
    "hidden",
  ] as const);
  let updatedPublishStart: string | undefined = undefined;
  let updatedPublishEnd: string | undefined = undefined;
  if (updatedStatus === "scheduled") {
    updatedPublishStart = new Date(
      Date.now() + 1000 * 60 * 60 * 2,
    ).toISOString(); // 2 hours from now
    updatedPublishEnd = new Date(
      Date.now() + 1000 * 60 * 60 * 25,
    ).toISOString(); // 25 hours from now
  } else if (updatedStatus === "active") {
    updatedPublishStart = undefined; // Immediate
    updatedPublishEnd = new Date(
      Date.now() + 1000 * 60 * 60 * 23,
    ).toISOString(); // 23 hours from now
  } else if (updatedStatus === "expired" || updatedStatus === "hidden") {
    updatedPublishEnd = new Date(Date.now() + 10000).toISOString(); // soon (expire/hide)
    updatedPublishStart = undefined;
  } // else: draft, leave as undefined

  const updateBody = {
    title: updatedTitle,
    body: updatedBody,
    target_audience: updatedAudience,
    status: updatedStatus,
    ...(updatedPublishStart !== undefined && {
      publish_start_at: updatedPublishStart,
    }),
    ...(updatedPublishEnd !== undefined && {
      publish_end_at: updatedPublishEnd,
    }),
  } satisfies IShoppingPlatformAnnouncement.IUpdate;

  const updated: IShoppingPlatformAnnouncement =
    await api.functional.shopping.admin.platformAnnouncements.update(
      connection,
      {
        platformAnnouncementId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate update is correct and auditable
  TestValidator.equals(
    "platformAnnouncementId unchanged",
    updated.id,
    created.id,
  );
  TestValidator.equals("admin_id persists", updated.admin_id, created.admin_id);
  TestValidator.equals("title updated", updated.title, updatedTitle);
  TestValidator.equals("body updated", updated.body, updatedBody);
  TestValidator.equals(
    "target audience updated",
    updated.target_audience,
    updatedAudience,
  );
  TestValidator.equals("status updated", updated.status, updatedStatus);
  if (updateBody.publish_start_at !== undefined)
    TestValidator.equals(
      "publish_start_at updated",
      updated.publish_start_at,
      updateBody.publish_start_at,
    );
  if (updateBody.publish_end_at !== undefined)
    TestValidator.equals(
      "publish_end_at updated",
      updated.publish_end_at,
      updateBody.publish_end_at,
    );
  TestValidator.notEquals(
    "updated_at changed after update",
    updated.updated_at,
    created.updated_at,
  );
}
