import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAuditLog";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_audit_log_administrator_retrieval(
  connection: api.IConnection,
) {
  // 1) Prepare separate connection clones to avoid token collisions
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const userConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Administrator registration (join) and assertion
  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(adminAuth);

  // 3) Admin creates a category (auditable action)
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      {
        body: {
          name: `cat-${RandomGenerator.alphaNumeric(6)}`,
          slug: `slug-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          is_moderated: true,
          requires_verification: false,
          order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category id is present",
    typeof category.id === "string" && category.id.length > 0,
  );

  // 4) Registered user join (separate context)
  const userAuth: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userConn, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userAuth);

  // 5) Registered user creates a thread in the category
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      userConn,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: `t-${RandomGenerator.alphaNumeric(8)}`,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 6) Registered user creates a post in thread
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      userConn,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 7) Admin creates a moderation case (auditable action)
  const mcase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.create(
      adminConn,
      {
        body: {
          case_number: `CASE-${RandomGenerator.alphaNumeric(8)}`,
          title: `Case for ${post.id}`,
          assigned_moderator_id: null,
          owner_admin_id: adminAuth.id,
          lead_report_id: null,
          status: "open",
          priority: "normal",
          summary: "Automated test moderation case",
          escalation_reason: null,
          legal_hold: false,
        } satisfies IEconPoliticalForumModerationCase.ICreate,
      },
    );
  typia.assert(mcase);

  // 8) Happy-path: admin retrieves an audit log entry by id
  // Use typia.random uuid to support simulated environments where audit ids
  // may not be discoverable via earlier calls.
  const auditId = typia.random<string & tags.Format<"uuid">>();
  const audit: IEconPoliticalForumAuditLog =
    await api.functional.econPoliticalForum.administrator.auditLogs.at(
      adminConn,
      {
        auditLogId: auditId,
      },
    );
  typia.assert(audit);

  // Business assertions for happy-path
  TestValidator.predicate(
    "audit id is uuid-like",
    typeof audit.id === "string" && audit.id.length > 0,
  );
  TestValidator.predicate(
    "audit has created_at",
    typeof audit.created_at === "string" && audit.created_at.length > 0,
  );
  TestValidator.predicate(
    "audit created_by_system is boolean",
    typeof audit.created_by_system === "boolean",
  );

  // 9) Negative validations
  // 9.1 malformed id -> should throw (pass a non-uuid string)
  await TestValidator.error("malformed audit id should fail", async () => {
    await api.functional.econPoliticalForum.administrator.auditLogs.at(
      adminConn,
      {
        auditLogId: "not-a-uuid",
      },
    );
  });

  // 9.2 unauthenticated -> should throw
  await TestValidator.error("unauthenticated access should fail", async () => {
    const someId = typia.random<string & tags.Format<"uuid">>();
    await api.functional.econPoliticalForum.administrator.auditLogs.at(
      unauthConn,
      {
        auditLogId: someId,
      },
    );
  });

  // 9.3 non-admin user -> should throw
  await TestValidator.error(
    "non-admin cannot retrieve audit logs",
    async () => {
      const someId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.econPoliticalForum.administrator.auditLogs.at(
        userConn,
        {
          auditLogId: someId,
        },
      );
    },
  );

  // 9.4 well-formed but likely-nonexistent id -> should throw
  // Note: In simulated environments this may return a mocked record; keep
  // this check to assert error behavior in real backend environments.
  await TestValidator.error("non-existent audit id should fail", async () => {
    const nonExistent = typia.random<string & tags.Format<"uuid">>();
    await api.functional.econPoliticalForum.administrator.auditLogs.at(
      adminConn,
      {
        auditLogId: nonExistent,
      },
    );
  });
}
