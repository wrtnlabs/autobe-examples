import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";

export async function test_api_audit_logs_search_by_moderator(
  connection: api.IConnection,
) {
  // 1) Member registration (creates member token on connection)
  const memberJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234", // 12 chars, meets complexity
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  // Save a snapshot of the current (member-authenticated) connection for later negative tests
  const memberConn: api.IConnection = {
    ...connection,
    headers: { ...(connection.headers ?? {}) },
  };

  // 2) Create an article as the member
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleCreateBody,
    });
  typia.assert(article);

  // 3) Create a comment under the article
  const commentCreateBody = {
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 4) Upload an attachment (metadata) for the article
  const attachmentCreateBody = {
    original_filename: "test-file.txt",
    storage_key: typia.random<string & tags.Format<"uri">>(),
    mime_type: "text/plain",
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<20971520>
    >(),
    is_image: false,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);

  // 5) Create a moderator account (connection will now contain moderator token)
  const moderatorJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModP@ssw0rd12", // 12+ chars
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuth);

  // 6) Build search request: resourceType='article', fullText from article.title, date range covering created artifacts
  const searchTerm = RandomGenerator.substring(article.title);
  const dateFrom = article.created_at;
  const dateTo = new Date(Date.now() + 60_000).toISOString(); // now + 1 minute

  const auditRequest = {
    resourceType: "article",
    fullText: searchTerm,
    dateFrom,
    dateTo,
    page: 1,
    limit: 20,
    sort: "-event_timestamp",
  } satisfies IDiscussionBoardAuditLog.IRequest;

  // 7) Moderator performs the search
  const auditPage: IPageIDiscussionBoardAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.auditLogs.index(connection, {
      body: auditRequest,
    });
  typia.assert(auditPage);

  // Basic pagination checks
  TestValidator.equals(
    "pagination current is 1",
    auditPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    auditPage.pagination.limit,
    20,
  );

  // Validate that at least one audit summary references the created resources
  TestValidator.predicate(
    "audit results reference created resources",
    auditPage.data.some(
      (d) =>
        d.resource_id === article.id ||
        d.resource_id === comment.id ||
        d.resource_id === attachment.id,
    ),
  );

  // Validate event timestamps are within the requested inclusive range
  TestValidator.predicate(
    "all event timestamps within requested range",
    auditPage.data.every((d) => {
      const ts = Date.parse(d.event_timestamp);
      return ts >= Date.parse(dateFrom) && ts <= Date.parse(dateTo);
    }),
  );

  // 8) Access control negative tests
  // 8a) Member (non-moderator) should NOT be able to query moderator audit logs
  await TestValidator.error(
    "member cannot access moderator audit logs",
    async () => {
      await api.functional.discussionBoard.moderator.auditLogs.index(
        memberConn,
        {
          body: auditRequest,
        },
      );
    },
  );

  // 8b) Unauthenticated connection should NOT be able to query moderator audit logs
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access moderator audit logs",
    async () => {
      await api.functional.discussionBoard.moderator.auditLogs.index(
        unauthConn,
        {
          body: auditRequest,
        },
      );
    },
  );
}
