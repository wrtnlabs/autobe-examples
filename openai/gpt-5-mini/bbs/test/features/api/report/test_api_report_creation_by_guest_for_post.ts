import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_report_creation_by_guest_for_post(
  connection: api.IConnection,
) {
  // 1) Register a new user who will create the thread and post
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8).toLowerCase(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(author);

  // 2) Create a thread as the registered user
  const threadCreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
    status: "open",
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: threadCreate,
      },
    );
  typia.assert(thread);

  // 3) Create a post in the thread as the registered user
  const postCreate = {
    thread_id: thread.id,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: postCreate,
      },
    );
  typia.assert(post);

  // 4) Prepare an unauthenticated connection for the guest report
  const guestConn: api.IConnection = { ...connection, headers: {} };

  // 5) Guest files a report against the created post (anonymous)
  const maliciousSnippet = "<script>alert(1)</script>";
  const reporterText = `@moderator Please review this post. Context: ${RandomGenerator.paragraph({ sentences: 8 })} ${maliciousSnippet}`;

  const reportBody = {
    reported_post_id: post.id,
    reason_code: "harassment",
    reporter_text: reporterText,
    reporter_anonymous: true,
  } satisfies IEconPoliticalForumReport.ICreate;

  const report: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.reports.create(guestConn, {
      body: reportBody,
    });
  typia.assert(report);

  // 6) Business assertions
  TestValidator.equals(
    "reported_post_id matches created post id",
    report.reported_post_id,
    post.id,
  );

  TestValidator.equals(
    "reason_code preserved",
    report.reason_code,
    "harassment",
  );

  TestValidator.equals(
    "reporter_anonymous preserved",
    report.reporter_anonymous,
    true,
  );

  TestValidator.predicate(
    "reporter identity omitted or null for anonymous report",
    report.reporter_id === null || report.reporter_id === undefined,
  );

  TestValidator.predicate(
    "created_at is present",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );

  // reporter_text should be sanitized by server; it must not contain executable script tags
  TestValidator.predicate(
    "reporter_text sanitized (no <script> tags)",
    !(report.reporter_text ?? "").toLowerCase().includes("<script"),
  );
}
