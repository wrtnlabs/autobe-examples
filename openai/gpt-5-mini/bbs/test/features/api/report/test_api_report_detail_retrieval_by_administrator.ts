import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

/**
 * Validate administrator retrieval of a moderation report's full details.
 *
 * Workflow:
 *
 * 1. Create administrator account and obtain admin authorization (adminConn).
 * 2. Create an author account (authorConn), then create a thread and a post.
 * 3. Create a reporter account (reporterConn) and submit a report targeting the
 *    post with reporter_anonymous=true and reporter_text containing unsafe HTML
 *    to validate sanitization.
 * 4. As administrator, retrieve the report by id and assert business rules:
 *
 *    - Report metadata is present and types are correct
 *    - Reporter_anonymous flag is honored and admin-visible reporter_id exists
 *    - Reported_post_id equals the created post id
 *    - Reporter_text is sanitized (no script tags)
 *    - Triage metadata present (status, priority, created_at)
 */
export async function test_api_report_detail_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1) Prepare isolated connections for different principals
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const reporterConn: api.IConnection = { ...connection, headers: {} };

  // 2) Administrator sign-up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: {
        email: adminEmail,
        password: "AdminPass1234", // satisfies MinLength<10>
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 3) Author sign-up (will be content author)
  const authorEmail: string = typia.random<string & tags.Format<"email">>();
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(authorConn, {
      body: {
        username: RandomGenerator.name(1),
        email: authorEmail,
        password: "AuthorPass1234",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  // 4) Create a thread as the author
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  const threadTitle = RandomGenerator.paragraph({ sentences: 6 });
  const threadSlug = RandomGenerator.paragraph({ sentences: 3 })
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      authorConn,
      {
        body: {
          category_id: categoryId satisfies string as string,
          title: threadTitle,
          slug: threadSlug,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 5) Create a post in that thread as the author
  const postContent = RandomGenerator.content({ paragraphs: 1 });
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      authorConn,
      {
        body: {
          thread_id: thread.id,
          content: postContent,
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 6) Reporter sign-up (different user) and file an authenticated anonymous report
  const reporterEmail: string = typia.random<string & tags.Format<"email">>();
  const reporter: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(reporterConn, {
      body: {
        username: RandomGenerator.name(1),
        email: reporterEmail,
        password: "ReporterPass1234",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(reporter);

  // Reporter creates a report targeting the created post. Include unsafe HTML
  // in reporter_text to validate server-side sanitization.
  const unsafeReporterText =
    '<div>Offensive content example</div><script>window.alert("x")</script>';
  const createdReport: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.reports.create(reporterConn, {
      body: {
        reported_post_id: post.id,
        reason_code: "harassment",
        reporter_text: unsafeReporterText,
        reporter_anonymous: true,
      } satisfies IEconPoliticalForumReport.ICreate,
    });
  typia.assert(createdReport);

  // 7) As administrator, retrieve the report by id
  const fetched: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.administrator.reports.at(
      adminConn,
      {
        reportId: createdReport.id,
      },
    );
  typia.assert(fetched);

  // 8) Business assertions
  TestValidator.equals(
    "report id matches created report",
    fetched.id,
    createdReport.id,
  );

  TestValidator.equals(
    "reported_post_id matches created post",
    fetched.reported_post_id,
    post.id,
  );

  TestValidator.predicate(
    "reporter_anonymous flag is true",
    fetched.reporter_anonymous === true,
  );

  // Admin view should include reporter_id even when reporter_anonymous === true
  TestValidator.predicate(
    "admin view includes reporter_id when reporter_anonymous is true",
    fetched.reporter_id !== null && fetched.reporter_id !== undefined,
  );

  // reporter_text should be sanitized (no raw <script> tags)
  TestValidator.predicate(
    "reporter_text is sanitized (no script tags)",
    typeof fetched.reporter_text === "string" &&
      !/<script\b/i.test(fetched.reporter_text ?? ""),
  );

  // triage metadata present
  TestValidator.predicate("status present", typeof fetched.status === "string");
  TestValidator.predicate(
    "priority present",
    typeof fetched.priority === "string",
  );
  TestValidator.predicate(
    "created_at is present",
    typeof fetched.created_at === "string" && fetched.created_at.length > 0,
  );

  // SDK does not expose GET /econPoliticalForum/posts/{postId}; ensure reported_post_id
  // equals created post id as the available means to resolve the target.
  TestValidator.equals(
    "reported_post_id resolvable by equality to created post id",
    fetched.reported_post_id,
    post.id,
  );

  // No explicit teardown here; rely on test DB reset between tests
}
