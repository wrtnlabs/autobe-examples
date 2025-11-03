import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_article_document_detailed_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category management (do this first)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass456!@#";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create category required for article creation (while authenticated as moderator)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<255>
          >(),
          description: typia.random<string & tags.MaxLength<2000>>(),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for article authorship and document upload
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const commonHref = typia.random<string & tags.Format<"uri">>();
  const commonReferrer = typia.random<string & tags.Format<"uri">>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
      href: commonHref,
      referrer: commonReferrer,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 4: Create article to serve as parent for document attachment
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: typia.random<string & tags.MinLength<5> & tags.MaxLength<200>>(),
        body: typia.random<
          string & tags.MinLength<20> & tags.MaxLength<50000>
        >(),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Upload document attachment to the article
  const documentUrl = typia.random<string & tags.Format<"uri">>();
  const originalFilename = "research_paper_2024.pdf";
  const documentMimeType = "application/pdf";
  const documentSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
  >();

  const uploadedDocument =
    await api.functional.discussionBoard.member.articles.documents.create(
      connection,
      {
        articleId: article.id,
        body: {
          url: documentUrl,
          original_name: originalFilename,
          mime_type: documentMimeType,
          size_bytes: documentSize,
        } satisfies IDiscussionBoardArticleDocument.ICreate,
      },
    );
  typia.assert(uploadedDocument);

  // Step 6: Retrieve detailed document information
  const retrievedDocument =
    await api.functional.discussionBoard.articles.documents.at(connection, {
      articleId: article.id,
      documentId: uploadedDocument.id,
    });
  typia.assert(retrievedDocument);

  // Step 7: Validate all document metadata fields
  TestValidator.equals(
    "document ID matches",
    retrievedDocument.id,
    uploadedDocument.id,
  );
  TestValidator.equals(
    "article association is correct",
    retrievedDocument.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "uploader member ID matches",
    retrievedDocument.uploaded_by_member_id,
    member.id,
  );
  TestValidator.equals(
    "original filename preserved",
    retrievedDocument.original_name,
    originalFilename,
  );
  TestValidator.equals(
    "MIME type matches",
    retrievedDocument.mime_type,
    documentMimeType,
  );
  TestValidator.equals(
    "file size matches",
    retrievedDocument.size_bytes,
    documentSize,
  );

  // Validate stored_name exists for internal reference
  TestValidator.predicate(
    "stored name exists",
    retrievedDocument.stored_name.length > 0,
  );

  // Validate created_at timestamp is properly formatted
  TestValidator.predicate(
    "created_at is valid date",
    new Date(retrievedDocument.created_at).getTime() > 0,
  );

  // Validate uploader information is included
  TestValidator.predicate(
    "uploader information included",
    retrievedDocument.uploader !== undefined,
  );
  if (retrievedDocument.uploader) {
    TestValidator.equals(
      "uploader ID matches member",
      retrievedDocument.uploader.id,
      member.id,
    );
    TestValidator.equals(
      "uploader username matches",
      retrievedDocument.uploader.username,
      member.username,
    );
  }
}
