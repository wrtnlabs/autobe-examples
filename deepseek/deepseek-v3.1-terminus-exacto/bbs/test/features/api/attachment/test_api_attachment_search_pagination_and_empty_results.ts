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

export async function test_api_attachment_search_pagination_and_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as member
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
  // Create multiple articles with attachments for pagination testing
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: `Test Article ${index + 1}`,
            body: RandomGenerator.content({ paragraphs: 2 }),
            discussion_board_section_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    return article;
  });
  // Create multiple attachments for each article
  const allAttachments: IDiscussionBoardAttachment[] = [];
  for (const article of articles) {
    const attachments = await ArrayUtil.asyncRepeat(3, async () => {
      const attachment =
        await generate_random_discussion_board_member_articles_attachments_create(
          memberConnection,
          {
            params: { articleId: article.id },
            body: {
              filename: `file_${RandomGenerator.alphaNumeric(8)}.txt`,
              filetype: "txt",
              mime_type: "text/plain",
              size_bytes: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
            } satisfies IDiscussionBoardAttachment.ICreate,
          },
        );
      typia.assert(attachment);
      return attachment;
    });
    allAttachments.push(...attachments);
  }
  // Test pagination with different page and limit combinations
  const paginationTests = [
    { page: 1, limit: 5 },
    { page: 2, limit: 5 },
    { page: 1, limit: 10 },
    { page: 3, limit: 3 },
  ];
  for (const paginationTest of paginationTests) {
    const searchResult =
      await api.functional.discussionBoard.member.search.attachments.index(
        memberConnection,
        {
          body: {
            page: paginationTest.page,
            limit: paginationTest.limit,
          } satisfies IDiscussionBoardAttachment.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate pagination metadata
    TestValidator.equals(
      `pagination current page for page=${paginationTest.page}, limit=${paginationTest.limit}`,
      searchResult.pagination.current,
      paginationTest.page,
    );
    TestValidator.equals(
      `pagination limit for page=${paginationTest.page}, limit=${paginationTest.limit}`,
      searchResult.pagination.limit,
      paginationTest.limit,
    );
    TestValidator.predicate(
      `pagination records count for page=${paginationTest.page}, limit=${paginationTest.limit}`,
      searchResult.pagination.records >= allAttachments.length,
    );
    TestValidator.predicate(
      `pagination pages count for page=${paginationTest.page}, limit=${paginationTest.limit}`,
      searchResult.pagination.pages >=
        Math.ceil(allAttachments.length / paginationTest.limit),
    );
    // Validate data array size
    TestValidator.predicate(
      `data array size for page=${paginationTest.page}, limit=${paginationTest.limit}`,
      searchResult.data.length <= paginationTest.limit,
    );
  }
  // Test empty result scenarios
  const emptySearchResult =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          search: "nonexistent_filename_pattern_that_will_not_match_anything",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Validate empty search result structure
  TestValidator.equals(
    "empty search result records count",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search result pages count",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search result data array length",
    emptySearchResult.data.length,
    0,
  );
  // Test file type filtering
  const fileTypeResult =
    await api.functional.discussionBoard.member.search.attachments.index(
      memberConnection,
      {
        body: {
          filetype: "txt",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(fileTypeResult);
  // Validate all returned attachments have the correct file type
  for (const attachment of fileTypeResult.data) {
    TestValidator.equals(
      "attachment file type matches filter",
      attachment.filetype,
      "txt",
    );
  }
}
