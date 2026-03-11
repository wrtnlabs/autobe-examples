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

export async function test_api_attachment_search_by_filename_pattern(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Create an article for attachments
  const article = await generate_random_discussion_board_member_articles_create(
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
  // Create multiple attachments with different filename patterns
  const fileTypes = ["pdf", "jpg", "docx", "png", "txt"];
  const mimeTypes = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    png: "image/png",
    txt: "text/plain",
  };
  const attachments = await Promise.all(
    fileTypes.map(async (fileType) => {
      const attachment =
        await generate_random_discussion_board_member_articles_attachments_create(
          memberConnection,
          {
            params: { articleId: article.id },
            body: {
              filename: `${RandomGenerator.alphabets(5)}_${fileType}_file.${fileType}`,
              filetype: fileType,
              mime_type: mimeTypes[fileType as keyof typeof mimeTypes],
              size_bytes: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1000> &
                  tags.Maximum<5000000>
              >(),
            } satisfies IDiscussionBoardAttachment.ICreate,
          },
        );
      typia.assert(attachment);
      return attachment;
    }),
  );
  // Test 1: Search by partial filename pattern (case-insensitive)
  const searchResults1 =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          search: "file",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResults1);
  TestValidator.equals(
    "search should return all attachments containing 'file' in filename",
    searchResults1.data.length,
    attachments.length,
  );
  // Test 2: Search by specific file extension pattern
  const searchResults2 =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          search: "pdf",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResults2);
  const pdfAttachments = attachments.filter((a) => a.filetype === "pdf");
  TestValidator.equals(
    "search should return only PDF attachments",
    searchResults2.data.length,
    pdfAttachments.length,
  );
  // Test 3: Case-insensitive search
  const searchResults3 =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          search: "PDF",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResults3);
  TestValidator.equals(
    "case-insensitive search should return same results",
    searchResults3.data.length,
    pdfAttachments.length,
  );
  // Test 4: Pagination with limit
  const searchResults4 =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          search: "file",
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResults4);
  TestValidator.equals(
    "pagination limit should be respected",
    searchResults4.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination metadata should be correct",
    searchResults4.pagination.limit === 2 &&
      searchResults4.pagination.current === 1 &&
      searchResults4.pagination.records >= attachments.length,
  );
  // Test 5: Empty search results for non-matching pattern
  const searchResults5 =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          search: "nonexistentpattern123",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResults5);
  TestValidator.equals(
    "non-matching pattern should return empty results",
    searchResults5.data.length,
    0,
  );
  // Test 6: Validate attachment metadata in search results
  if (searchResults1.data.length > 0) {
    const resultAttachment = searchResults1.data[0];
    TestValidator.predicate(
      "search result should contain filename",
      resultAttachment.filename.length > 0,
    );
    TestValidator.predicate(
      "search result should contain filetype",
      resultAttachment.filetype.length > 0,
    );
    TestValidator.predicate(
      "search result should contain MIME type",
      resultAttachment.mime_type.length > 0,
    );
    TestValidator.predicate(
      "search result should contain file size",
      resultAttachment.size_bytes > 0,
    );
    TestValidator.predicate(
      "search result should contain article information",
      resultAttachment.article.id === article.id &&
        resultAttachment.article.title === article.title,
    );
  }
}
