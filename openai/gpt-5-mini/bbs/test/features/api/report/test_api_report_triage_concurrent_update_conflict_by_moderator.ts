import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_report_triage_concurrent_update_conflict_by_moderator(
  connection: api.IConnection,
) {
  // 1) Prepare isolated connections for user and moderator
  const userConn: api.IConnection = { ...connection, headers: {} };
  const modConn: api.IConnection = { ...connection, headers: {} };

  // 2) Register a regular user
  const userAuth: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userConn, {
      body: {
        username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssw0rd-TEST-1",
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userAuth);

  // 3) User creates a thread
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      userConn,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(8),
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 4) User creates a post
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      userConn,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 5) Create a report targeting the post
  const createdReport: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.reports.create(userConn, {
      body: {
        reported_post_id: post.id,
        reason_code: "harassment",
        reporter_text: RandomGenerator.paragraph({ sentences: 8 }),
        reporter_anonymous: false,
      } satisfies IEconPoliticalForumReport.ICreate,
    });
  typia.assert(createdReport);

  // 6) Register a moderator and authenticate
  const modAuth: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(modConn, {
      body: {
        username: `mod_${RandomGenerator.alphaNumeric(6)}`.toLowerCase(),
        email: typia.random<string & tags.Format<"email">>(),
        password: "ModP@ss-1234",
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(modAuth);

  // 7) Moderator: perform first triage update (expected success)
  const triage: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.moderator.reports.update(modConn, {
      reportId: createdReport.id,
      body: {
        status: "triaged",
        triaged_at: new Date().toISOString(),
      } satisfies IEconPoliticalForumReport.IUpdate,
    });
  typia.assert(triage);

  // 8) Simulate stale update: attempt an update based on the original created timestamp
  // NOTE: The DTO does not expose an explicit "updated_at" concurrency token.
  // Using triaged_at with an older timestamp (created_at) is our surrogate for
  // a stale update attempt. Per E2E rules, we must not assert exact HTTP status
  // codes. Instead, assert that the stale update throws an error.
  await TestValidator.error(
    "stale update attempt should throw due to optimistic concurrency",
    async () => {
      await api.functional.econPoliticalForum.moderator.reports.update(
        modConn,
        {
          reportId: createdReport.id,
          body: {
            priority: "high",
            // use an older timestamp (created_at) to simulate staleness
            triaged_at: createdReport.created_at,
          } satisfies IEconPoliticalForumReport.IUpdate,
        },
      );
    },
  );

  // 9) After the attempted stale update, verify canonical state remains the successful triage
  // Use an idempotent update (empty body) to retrieve canonical record because
  // there is no GET /reports/:id endpoint in the provided SDK.
  const canonical: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.moderator.reports.update(modConn, {
      reportId: createdReport.id,
      body: {} satisfies IEconPoliticalForumReport.IUpdate,
    });
  typia.assert(canonical);

  TestValidator.equals(
    "canonical status equals triage status",
    canonical.status,
    triage.status,
  );
  TestValidator.equals(
    "priority unchanged by stale update",
    canonical.priority,
    triage.priority,
  );

  // 10) Teardown: mark the report as resolved/dismissed to clean state
  const resolved: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.moderator.reports.update(modConn, {
      reportId: createdReport.id,
      body: {
        status: "dismissed",
        resolved_at: new Date().toISOString(),
      } satisfies IEconPoliticalForumReport.IUpdate,
    });
  typia.assert(resolved);
}
