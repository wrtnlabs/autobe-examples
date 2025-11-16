import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotification";

/**
 * Validate that an admin can create a notification for a member user using only
 * the required fields of ICommunityPlatformNotification.ICreate, explicitly
 * passing null for optional fields while relying on backend defaults for the
 * read flag.
 *
 * Business context:
 *
 * - A member user registers through the public member join endpoint and becomes
 *   the recipient of notifications.
 * - An admin user registers and is treated as the privileged actor allowed to
 *   create notifications via the admin-only endpoint.
 * - The notification creation DTO allows certain optional fields to be null or
 *   omitted, with is_read defaulting to false on the server when not explicitly
 *   set.
 *
 * This test ensures that when an admin creates a notification by specifying
 * only the minimal required data plus explicit nulls for optional linkage
 * fields, the backend:
 *
 * - Persists the notification correctly for the intended member user.
 * - Applies server-side defaults such as is_read=false.
 * - Returns a fully shaped ICommunityPlatformNotification that matches the
 *   request for category/title and respects the nulls for body/target fields.
 *
 * Steps:
 *
 * 1. Register a member user via POST /auth/memberUser/join and capture the
 *    resulting member id.
 * 2. Register an admin user via POST /auth/adminUser/join; this also sets the
 *    Authorization header on the shared connection to the admin token.
 * 3. As the admin, call POST /communityPlatform/adminUser/notifications with an
 *    ICommunityPlatformNotification.ICreate payload containing:
 *
 *    - Community_platform_memberuser_id: the member id from step 1.
 *    - Category: a concrete category string like "system".
 *    - Title: a non-empty string.
 *    - Body: null.
 *    - Target_type: null.
 *    - Target_id: null.
 *    - Is_read: null (to trigger the backend defaulting logic).
 * 4. Validate the response ICommunityPlatformNotification by asserting:
 *
 *    - Structural/type correctness via typia.assert().
 *    - Category and title equal the request values.
 *    - Body, target_type, target_id are null.
 *    - Is_read is false (defaulted), not null.
 *    - Read_at is null for an unread notification.
 *    - Created_at and updated_at are present (typia.assert already enforces proper
 *         date-time format).
 *
 * Note: Although the scenario draft mentions a subsequent GET
 * /communityPlatform/memberUser/notifications/{notificationId}, that endpoint
 * is not exposed in the provided SDK, so this test limits its verification to
 * the create response itself.
 */
export async function test_api_admin_creates_notification_with_minimal_required_fields(
  connection: api.IConnection,
) {
  // 1. Register a member user who will receive the notification.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register an admin user; this also sets the Authorization header
  //    on the connection to the admin's access token.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Admin creates a notification with minimal required fields and
  //    explicit nulls for optional body/target/is_read.
  const category = "system";
  const title = RandomGenerator.paragraph({ sentences: 3 });

  const createBody = {
    community_platform_memberuser_id: memberAuthorized.id,
    category,
    title,
    body: null,
    target_type: null,
    target_id: null,
    is_read: null,
  } satisfies ICommunityPlatformNotification.ICreate;

  const notification: ICommunityPlatformNotification =
    await api.functional.communityPlatform.adminUser.notifications.create(
      connection,
      { body: createBody },
    );
  typia.assert(notification);

  // 4. Validate business expectations on the created notification.
  TestValidator.equals(
    "notification category matches request",
    notification.category,
    category,
  );

  TestValidator.equals(
    "notification title matches request",
    notification.title,
    title,
  );

  TestValidator.equals(
    "notification body remains null when requested as null",
    notification.body ?? null,
    null,
  );

  TestValidator.equals(
    "notification target_type is null when requested as null",
    notification.target_type ?? null,
    null,
  );

  TestValidator.equals(
    "notification target_id is null when requested as null",
    notification.target_id ?? null,
    null,
  );

  TestValidator.equals(
    "notification is_read defaults to false even when null was provided",
    notification.is_read,
    false,
  );

  TestValidator.equals(
    "notification read_at is null for unread notification",
    notification.read_at ?? null,
    null,
  );

  TestValidator.predicate(
    "notification created_at is a non-empty string (date-time validated by typia)",
    typeof notification.created_at === "string" &&
      notification.created_at.length > 0,
  );

  TestValidator.predicate(
    "notification updated_at is a non-empty string (date-time validated by typia)",
    typeof notification.updated_at === "string" &&
      notification.updated_at.length > 0,
  );
}
