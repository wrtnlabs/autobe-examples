import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPlatformAnnouncement";

/**
 * Validate that a shopping platform admin can create a new platform
 * announcement using all required fields.
 *
 * This test covers:
 *
 * 1. Admin registration (authn).
 * 2. Creation of a new platform-wide announcement with all fields (title, body,
 *    target_audience, status, scheduled times).
 * 3. Validating that the returned announcement includes all the submitted fields
 *    AND system-assigned audit information (admin_id, created_at, updated_at,
 *    etc).
 * 4. Verification of business rules: correct scheduling, valid audience values,
 *    minimal/maximal content, etc.
 *
 * Note: Type error/missing required field business rules tests are omitted as
 * per type safety requirements.
 */
export async function test_api_platform_announcement_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registration (authentication)
  const adminEmail = `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@company.com`;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create platform announcement (all required fields)
  const now = new Date();
  const start = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 min from now
  const end = new Date(now.getTime() + 120 * 60 * 1000).toISOString(); // 2 hours from now
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 16,
      wordMin: 4,
      wordMax: 10,
    }),
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
    publish_start_at: start,
    publish_end_at: end,
  } satisfies IShoppingPlatformAnnouncement.ICreate;
  const announcement: IShoppingPlatformAnnouncement =
    await api.functional.shopping.admin.platformAnnouncements.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(announcement);

  // Step 3: Validate returned fields match inputs
  TestValidator.equals(
    "announcement title",
    announcement.title,
    createBody.title,
  );
  TestValidator.equals("announcement body", announcement.body, createBody.body);
  TestValidator.equals(
    "announcement audience",
    announcement.target_audience,
    createBody.target_audience,
  );
  TestValidator.equals(
    "announcement status",
    announcement.status,
    createBody.status,
  );
  TestValidator.equals(
    "announcement publish_start_at",
    announcement.publish_start_at,
    createBody.publish_start_at,
  );
  TestValidator.equals(
    "announcement publish_end_at",
    announcement.publish_end_at,
    createBody.publish_end_at,
  );
  TestValidator.equals(
    "announcement admin_id matches created admin",
    announcement.admin_id,
    admin.id,
  );
  TestValidator.predicate(
    "announcement id is uuid",
    typeof announcement.id === "string" &&
      /[0-9a-f-]{36}/.test(announcement.id),
  );
  TestValidator.predicate(
    "created_at should be ISO date string",
    typeof announcement.created_at === "string" &&
      !isNaN(Date.parse(announcement.created_at!)),
  );
  TestValidator.predicate(
    "updated_at should be ISO date string",
    typeof announcement.updated_at === "string" &&
      !isNaN(Date.parse(announcement.updated_at!)),
  );
}
