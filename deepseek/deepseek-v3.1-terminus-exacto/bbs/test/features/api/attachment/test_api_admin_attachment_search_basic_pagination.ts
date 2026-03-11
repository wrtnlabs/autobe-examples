import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

/**
 * Test the basic administrative attachment search functionality with pagination.
 * Create multiple articles with various attachments (PDF documents, images, text files)
 * across different sections. As an admin, authenticate and perform a search with
 * pagination parameters to verify search accuracy and pagination metadata.
 */
export async function test_api_admin_attachment_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create member connection for article creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://test.com",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create multiple articles with different attachment types
  const articles: IDiscussionBoardArticle[] = [];
  const attachments: IDiscussionBoardAttachment[] = [];
  // Create 3 articles with different attachment types
  for (let i = 0; i < 3; i++) {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            body: RandomGenerator.content({ paragraphs: 3 }),
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    articles.push(article);
    // Create different attachment types for each article
    const attachmentTypes = [
      {
        filename: "document.pdf",
        filetype: "pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
      },
      {
        filename: "image.jpg",
        filetype: "jpg",
        mime_type: "image/jpeg",
        size_bytes: 2048,
      },
      {
        filename: "text.txt",
        filetype: "txt",
        mime_type: "text/plain",
        size_bytes: 512,
      },
    ];
    for (const attachmentType of attachmentTypes) {
      const attachment =
        await generate_random_discussion_board_member_articles_attachments_create(
          memberConnection,
          {
            body: attachmentType satisfies IDiscussionBoardAttachment.ICreate,
            params: { articleId: article.id },
          },
        );
      typia.assert(attachment);
      attachments.push(attachment);
    }
  }
  // Test pagination with limit and page parameters
  const searchRequest: IDiscussionBoardAttachment.IRequest = {
    limit: 5 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number,
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1> as number,
  };
  const searchResult =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      { body: searchRequest },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 5);
  TestValidator.predicate(
    "total records should be at least 9",
    searchResult.pagination.records >= 9,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    searchResult.pagination.pages >= 2,
  );
  // Validate search results structure
  TestValidator.predicate(
    "data array should have correct length",
    searchResult.data.length <= 5 && searchResult.data.length > 0,
  );
  for (const attachment of searchResult.data) {
    TestValidator.predicate(
      "attachment should have filename",
      attachment.filename.length > 0,
    );
    TestValidator.predicate(
      "attachment should have filetype",
      attachment.filetype.length > 0,
    );
    TestValidator.predicate(
      "attachment should have mime_type",
      attachment.mime_type.length > 0,
    );
    TestValidator.predicate(
      "attachment should have size_bytes",
      attachment.size_bytes > 0,
    );
    TestValidator.predicate(
      "attachment should have article reference",
      attachment.article.id.length > 0,
    );
  }
  // Test file type filtering
  const pdfSearchRequest: IDiscussionBoardAttachment.IRequest = {
    filetype: "pdf",
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number,
  };
  const pdfSearchResult =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      { body: pdfSearchRequest },
    );
  typia.assert(pdfSearchResult);
  // Verify all results are PDF files
  for (const attachment of pdfSearchResult.data) {
    TestValidator.equals("filetype should be pdf", attachment.filetype, "pdf");
  }
  // Test empty search (should return all attachments)
  const emptySearchResult =
    await api.functional.discussionBoard.admin.search.attachments.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search should return all attachments",
    emptySearchResult.pagination.records >= 9,
  );
}
