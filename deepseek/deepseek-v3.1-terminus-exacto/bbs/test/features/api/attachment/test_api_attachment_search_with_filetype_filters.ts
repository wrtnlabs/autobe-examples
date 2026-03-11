import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

export async function test_api_attachment_search_with_filetype_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register and authenticate member
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Create test articles with various attachments
  const articles: IDiscussionBoardArticle[] = [];
  const attachments: IDiscussionBoardAttachment[] = [];
  // Record creation timestamps for date filtering
  const startTime = new Date().toISOString();
  // Create multiple articles with different attachment types
  for (let i = 0; i < 3; i++) {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: `Test Article ${i + 1} - ${RandomGenerator.alphabets(5)}`,
            body: RandomGenerator.content({ paragraphs: 2 }),
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    articles.push(article);
    // Add PDF attachment (larger files)
    const pdfAttachment =
      await generate_random_discussion_board_member_articles_attachments_create(
        memberConnection,
        {
          params: { articleId: article.id },
          body: {
            filename: `document_${i + 1}.pdf`,
            filetype: "pdf",
            mime_type: "application/pdf",
            size_bytes: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<500000> &
                tags.Maximum<2000000>
            >(),
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(pdfAttachment);
    attachments.push(pdfAttachment);
    // Add JPEG attachment (medium files)
    const jpgAttachment =
      await generate_random_discussion_board_member_articles_attachments_create(
        memberConnection,
        {
          params: { articleId: article.id },
          body: {
            filename: `image_${i + 1}.jpg`,
            filetype: "jpg",
            mime_type: "image/jpeg",
            size_bytes: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100000> &
                tags.Maximum<1000000>
            >(),
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(jpgAttachment);
    attachments.push(jpgAttachment);
    // Add text attachment (small files)
    const txtAttachment =
      await generate_random_discussion_board_member_articles_attachments_create(
        memberConnection,
        {
          params: { articleId: article.id },
          body: {
            filename: `text_${i + 1}.txt`,
            filetype: "txt",
            mime_type: "text/plain",
            size_bytes: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100> &
                tags.Maximum<5000>
            >(),
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(txtAttachment);
    attachments.push(txtAttachment);
  }
  const endTime = new Date().toISOString();
  // Wait a moment for attachments to be processed
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test 1: Filter by filetype 'pdf'
  const pdfResults =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          filetype: "pdf",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(pdfResults);
  TestValidator.predicate(
    "PDF results have correct filetype",
    pdfResults.data.every((attachment) => attachment.filetype === "pdf"),
  );
  // Test 2: Filter by filetype 'jpg'
  const jpgResults =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          filetype: "jpg",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(jpgResults);
  TestValidator.predicate(
    "JPG results have correct filetype",
    jpgResults.data.every((attachment) => attachment.filetype === "jpg"),
  );
  // Test 3: Filter by MIME type 'application/pdf'
  const pdfMimeResults =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          mime_type: "application/pdf",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(pdfMimeResults);
  TestValidator.predicate(
    "PDF MIME results have correct mime_type",
    pdfMimeResults.data.every(
      (attachment) => attachment.mime_type === "application/pdf",
    ),
  );
  // Test 4: Filter by MIME type 'image/jpeg'
  const jpegMimeResults =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          mime_type: "image/jpeg",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(jpegMimeResults);
  TestValidator.predicate(
    "JPEG MIME results have correct mime_type",
    jpegMimeResults.data.every(
      (attachment) => attachment.mime_type === "image/jpeg",
    ),
  );
  // Test 5: Combined filetype and size filtering
  const pdfLargeResults =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          filetype: "pdf",
          size_min: 1000000,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(pdfLargeResults);
  TestValidator.predicate(
    "PDF large results meet size minimum",
    pdfLargeResults.data.every(
      (attachment) =>
        attachment.filetype === "pdf" && attachment.size_bytes >= 1000000,
    ),
  );
  // Test 6: Date range filtering using recorded timestamps
  const dateRangeResults =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          created_after: startTime,
          created_before: endTime,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  TestValidator.predicate(
    "Date range results include our test attachments",
    dateRangeResults.data.length >= attachments.length,
  );
  // Test 7: File size range filtering
  const sizeRangeResults =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          size_min: 1000,
          size_max: 500000,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(sizeRangeResults);
  TestValidator.predicate(
    "Size range results meet size constraints",
    sizeRangeResults.data.every(
      (attachment) =>
        attachment.size_bytes >= 1000 && attachment.size_bytes <= 500000,
    ),
  );
  // Test 8: Multiple filter combination
  const combinedResults =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          filetype: "txt",
          mime_type: "text/plain",
          size_min: 100,
          size_max: 10000,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(combinedResults);
  TestValidator.predicate(
    "Combined filter results meet all criteria",
    combinedResults.data.every(
      (attachment) =>
        attachment.filetype === "txt" &&
        attachment.mime_type === "text/plain" &&
        attachment.size_bytes >= 100 &&
        attachment.size_bytes <= 10000,
    ),
  );
  // Test 9: Search by filename pattern
  const searchResults =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          search: "document",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "Search results contain document in filename",
    searchResults.data.every((attachment) =>
      attachment.filename.toLowerCase().includes("document"),
    ),
  );
}
