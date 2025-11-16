import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";

/**
 * Validate paginated, filtered attachment listing for a comment as an
 * authenticated user.
 *
 * This test ensures:
 *
 * 1. User registration and authentication is set up for the test context.
 * 2. The user creates a new discussion article.
 * 3. The user creates a comment on that article.
 * 4. Two different attachments (with different filenames and MIME types) are
 *    uploaded and attached to the comment.
 * 5. Retrieval of the list of attachments for the comment with: (a) no filter, (b)
 *    pagination, (c) filename filter, (d) MIME type filter, and (e) ordering.
 * 6. The business rule of max two attachments per comment is enforced by verifying
 *    only two can be created and retrieved, and attempts to fetch attachments
 *    from other comments or users return none.
 * 7. Metadata fields including file_url, original_filename, mime_type,
 *    file_size_bytes, and created_at are correct and conform to the DTO
 *    schema.
 */
export async function test_api_comment_attachment_list_with_auth(
  connection: api.IConnection,
) {
  // 1. User registration/authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userHref = `https://example.com/${RandomGenerator.alphaNumeric(8)}`;
  const userReferrer = `https://referrer.com/${RandomGenerator.alphaNumeric(6)}`;
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: userHref,
      referrer: userReferrer,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Create article
  const articleTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 6,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3. Create comment
  const commentBody = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const comment = await api.functional.discussionBoard.user.comments.create(
    connection,
    {
      body: {
        discussion_board_article_id: article.id,
        body: commentBody,
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 4. Attach two attachments (distinct filenames/types) to the comment
  const attA = {
    file_url:
      `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(12)}` as string &
        tags.Format<"uri">,
    original_filename: RandomGenerator.name(2).replace(" ", "_") + ".png",
    mime_type: "image/png",
    file_size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >(),
  } satisfies IDiscussionBoardCommentAttachment.ICreate;

  const attB = {
    file_url:
      `https://cdn.example.com/docs/${RandomGenerator.alphaNumeric(10)}` as string &
        tags.Format<"uri">,
    original_filename: RandomGenerator.name(2).replace(" ", "_") + ".pdf",
    mime_type: "application/pdf",
    file_size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >(),
  } satisfies IDiscussionBoardCommentAttachment.ICreate;

  // Attachment 1
  const attachmentA =
    await api.functional.discussionBoard.user.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: attA,
      },
    );
  typia.assert(attachmentA);

  // Attachment 2
  const attachmentB =
    await api.functional.discussionBoard.user.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: attB,
      },
    );
  typia.assert(attachmentB);

  // 5. Retrieve: (a) full listing (no filter)
  const resultAll =
    await api.functional.discussionBoard.user.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
        body: {} satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(resultAll);
  TestValidator.equals("Should return 2 attachments", resultAll.data.length, 2);
  TestValidator.predicate(
    "returned both attachment filenames",
    resultAll.data.every((att) =>
      [attA.original_filename, attB.original_filename].includes(
        att.original_filename,
      ),
    ),
  );

  // Verify pagination metadata
  TestValidator.predicate(
    "pagination meta correct for 2 attachments",
    resultAll.pagination.records === 2 && resultAll.pagination.pages === 1,
  );

  // (b) Pagination: limit=1, offset=0 (first page)
  const resultPage1 =
    await api.functional.discussionBoard.user.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
        body: {
          limit: 1,
          offset: 0,
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(resultPage1);
  TestValidator.equals("one attachment page 1", resultPage1.data.length, 1);
  TestValidator.equals("pagination limit 1", resultPage1.pagination.limit, 1);

  // (c) Filename filter (filter by attA.original_filename)
  const filteredByFilename =
    await api.functional.discussionBoard.user.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
        body: {
          original_filename: attA.original_filename,
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(filteredByFilename);
  TestValidator.equals(
    "filename filter returns only attA",
    filteredByFilename.data.length,
    1,
  );
  TestValidator.equals(
    "filtered attachment filename matches",
    filteredByFilename.data[0].original_filename,
    attA.original_filename,
  );

  // (d) MIME type filter (application/pdf)
  const filteredByMime =
    await api.functional.discussionBoard.user.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
        body: {
          mime_type: "application/pdf",
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(filteredByMime);
  TestValidator.equals(
    "mimeType filter returns 1",
    filteredByMime.data.length,
    1,
  );
  TestValidator.equals(
    "filtered attachment is PDF",
    filteredByMime.data[0].mime_type,
    "application/pdf",
  );

  // (e) sort_by original_filename ASC
  const resultSorted =
    await api.functional.discussionBoard.user.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
        body: {
          sort_by: "original_filename",
          sort_order: "asc",
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(resultSorted);
  TestValidator.equals(
    "attachments are sorted by filename ASC",
    resultSorted.data.map((x) => x.original_filename),
    [...[attA.original_filename, attB.original_filename]].sort(),
  );

  // 6. Confirm only 2 attachments per comment (enforcing business rule)
  await TestValidator.error(
    "third attachment creation should fail",
    async () => {
      await api.functional.discussionBoard.user.comments.attachments.create(
        connection,
        {
          commentId: comment.id,
          body: {
            file_url:
              `https://cdn.example.com/overflow/${RandomGenerator.alphaNumeric(9)}` as string &
                tags.Format<"uri">,
            original_filename:
              RandomGenerator.name(2).replace(" ", "_") + ".txt",
            mime_type: "text/plain",
            file_size_bytes: 100,
          } satisfies IDiscussionBoardCommentAttachment.ICreate,
        },
      );
    },
  );

  // 7. Verify metadata fields for at least one returned record
  const attMeta = resultAll.data[0];
  TestValidator.predicate(
    "file_url is valid uri format",
    typeof attMeta.file_url === "string" &&
      !!attMeta.file_url.startsWith("https://"),
  );
  TestValidator.predicate(
    "filename present",
    typeof attMeta.original_filename === "string" &&
      attMeta.original_filename.length > 0,
  );
  TestValidator.predicate(
    "mimeType present",
    typeof attMeta.mime_type === "string" && attMeta.mime_type.length > 0,
  );
  TestValidator.predicate(
    "file size is positive int32",
    typeof attMeta.file_size_bytes === "number" && attMeta.file_size_bytes > 0,
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof attMeta.created_at === "string" && attMeta.created_at.length > 10,
  );

  // 8. Ensure retrieval with unrelated commentId yields no attachments
  const bogusCommentId = typia.random<string & tags.Format<"uuid">>();
  const noneResult =
    await api.functional.discussionBoard.user.comments.attachments.index(
      connection,
      {
        commentId: bogusCommentId,
        body: {} satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(noneResult);
  TestValidator.equals(
    "other commentId returns no data",
    noneResult.data.length,
    0,
  );
}
