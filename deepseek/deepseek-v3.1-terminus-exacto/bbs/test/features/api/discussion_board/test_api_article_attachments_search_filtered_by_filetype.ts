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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_attachments_search_filtered_by_filetype(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
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
  // 2. Create an article
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
  // 3. Search attachments with different file type filters
  const fileTypes = ["pdf", "jpg", "docx"] as const;
  for (const fileType of fileTypes) {
    const searchResult =
      await api.functional.discussionBoard.articles.attachments.index(
        memberConnection,
        {
          articleId: article.id,
          body: {
            filetype: fileType,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardAttachment.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate pagination metadata
    TestValidator.equals(
      `${fileType} search pagination current page`,
      searchResult.pagination.current,
      1,
    );
    TestValidator.equals(
      `${fileType} search pagination limit`,
      searchResult.pagination.limit,
      10,
    );
    TestValidator.predicate(
      `${fileType} search pagination records non-negative`,
      searchResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${fileType} search pagination pages non-negative`,
      searchResult.pagination.pages >= 0,
    );
    // Validate that each attachment in filtered results matches the requested file type
    for (const attachment of searchResult.data) {
      TestValidator.equals(
        `${fileType} attachment filetype match`,
        attachment.filetype,
        fileType,
      );
      // Validate attachment metadata completeness
      TestValidator.predicate(
        `${fileType} attachment has filename`,
        attachment.filename.length > 0,
      );
      TestValidator.predicate(
        `${fileType} attachment has mime_type`,
        attachment.mime_type.length > 0,
      );
      TestValidator.predicate(
        `${fileType} attachment has positive size`,
        attachment.size_bytes > 0,
      );
      TestValidator.predicate(
        `${fileType} attachment has valid timestamp`,
        new Date(attachment.created_at).getTime() > 0,
      );
      TestValidator.predicate(
        `${fileType} attachment has article reference`,
        attachment.article.id.length > 0,
      );
    }
  }
  // 4. Test search without file type filter (should return all attachments)
  const allAttachmentsResult =
    await api.functional.discussionBoard.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(allAttachmentsResult);
  TestValidator.equals(
    "unfiltered search pagination current page",
    allAttachmentsResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "unfiltered search pagination limit",
    allAttachmentsResult.pagination.limit,
    10,
  );
}
