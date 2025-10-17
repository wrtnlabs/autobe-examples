import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAuditLog";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumSiteSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumSiteSetting";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumAuditLog";

/**
 * Validate admin audit-log search and filtering behavior.
 *
 * Business context:
 *
 * - Administrators must be able to search and inspect audit logs for
 *   investigating moderation actions and configuration changes. Certain
 *   sensitive details are redacted by default; expanded detail views are
 *   auditable as well.
 *
 * Test steps:
 *
 * 1. Create admin, moderator, and registered user accounts (join flows).
 * 2. Admin creates a category to host the thread.
 * 3. Registered user creates a thread and a post within that thread.
 * 4. Moderator soft-deletes the post (generates a moderator audit entry).
 * 5. Admin patches a site setting (generates an admin audit entry).
 * 6. Admin searches audit logs over a recent time window and verifies that audit
 *    entries exist for both the moderator action and the admin action.
 */
export async function test_api_audit_logs_admin_search_and_filter(
  connection: api.IConnection,
) {
  // 1) Prepare three isolated authenticated contexts (admin, moderator, user)
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const modConn: api.IConnection = { ...connection, headers: {} };
  const userConn: api.IConnection = { ...connection, headers: {} };

  // 1.a Admin join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(1),
  } satisfies IEconPoliticalForumAdministrator.IJoin;
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 1.b Moderator join
  const modJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModeratorPassw0rd!",
    display_name: RandomGenerator.name(1),
  } satisfies IEconPoliticalForumModerator.ICreate;
  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(modConn, {
      body: modJoinBody,
    });
  typia.assert(moderator);

  // 1.c Registered user join
  const userJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPassw0rd!",
    display_name: RandomGenerator.name(1),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;
  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userConn, {
      body: userJoinBody,
    });
  typia.assert(user);

  // 2) As admin, create a category
  const categoryBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_moderated: false,
    requires_verification: false,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3) As registered user, create a thread in the category
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
    status: "open",
    pinned: false,
  } satisfies IEconPoliticalForumThread.ICreate;
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      userConn,
      { body: threadBody },
    );
  typia.assert(thread);

  // 4) As registered user, create a post in the thread
  const postBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IEconPoliticalForumPost.ICreate;
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      userConn,
      { body: postBody },
    );
  typia.assert(post);

  // 5) As moderator, soft-delete the post to generate a moderation/audit log entry
  await api.functional.econPoliticalForum.moderator.posts.erase(modConn, {
    postId: post.id,
  });

  // 6) As admin, perform a site settings patch to produce an admin audit event
  const siteSettingBody = {
    // Intentionally small partial update; server decides target record in real system.
    is_public: true,
  } satisfies IEconPoliticalForumSiteSetting.IUpdate;
  const siteSetting: IEconPoliticalForumSiteSetting =
    await api.functional.econPoliticalForum.administrator.siteSettings.patch(
      adminConn,
      { body: siteSettingBody },
    );
  typia.assert(siteSetting);

  // 7) As admin, search audit logs for recent events covering our actions
  const windowFrom = new Date(Date.now() - 1000 * 60 * 5).toISOString(); // 5 minutes ago
  const windowTo = new Date(Date.now() + 1000 * 60).toISOString(); // 1 minute in future
  const auditRequest = {
    created_from: windowFrom,
    created_to: windowTo,
    // Use reasonable pagination defaults; server enforces limits
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IEconPoliticalForumAuditLog.IRequest;

  const page: IPageIEconPoliticalForumAuditLog =
    await api.functional.econPoliticalForum.administrator.auditLogs.index(
      adminConn,
      { body: auditRequest },
    );
  typia.assert(page);

  // Business validations
  TestValidator.predicate(
    "audit page has pagination metadata",
    page.pagination !== undefined && page.pagination.records >= 0,
  );

  TestValidator.predicate(
    "audit page returns entries array",
    Array.isArray(page.data),
  );

  // Find audit entry for moderator action that targeted our post
  const hasModeratorEntry: boolean = page.data.some((e) => {
    // Some audit records include explicit post_id, some use target_identifier
    return (
      (e.post_id !== undefined && e.post_id === post.id) ||
      e.target_identifier === post.id ||
      e.moderator_id === moderator.id
    );
  });
  TestValidator.predicate(
    "audit logs include moderator action for the deleted post",
    hasModeratorEntry,
  );

  // Find audit entry for admin action (site settings change) by actor id or target identifier
  const hasAdminEntry: boolean = page.data.some((e) => {
    return (
      (e.registereduser_id !== undefined && e.registereduser_id === admin.id) ||
      (siteSetting.id !== undefined && e.target_identifier === siteSetting.id)
    );
  });
  TestValidator.predicate(
    "audit logs include admin site setting change",
    hasAdminEntry,
  );

  // Ensure returned entries contain required summary fields and details redacted by default
  TestValidator.predicate(
    "audit entries contain required summary fields",
    page.data.every(
      (e) =>
        typeof e.id === "string" &&
        typeof e.action_type === "string" &&
        typeof e.created_at === "string",
    ),
  );

  TestValidator.predicate(
    "audit details redacted or present but not required as full payload",
    page.data.every(
      (e) =>
        e.details === null ||
        typeof e.details === "string" ||
        e.details === undefined,
    ),
  );
}
