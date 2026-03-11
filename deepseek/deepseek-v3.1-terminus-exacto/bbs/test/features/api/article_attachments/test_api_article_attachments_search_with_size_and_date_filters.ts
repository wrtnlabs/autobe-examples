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

export async function test_api_article_attachments_search_with_size_and_date_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
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
  // Create article
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
  // Test basic attachment search without filters
  const initialResults =
    await api.functional.discussionBoard.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(initialResults);
  // Test size filtering - minimum size
  const sizeMinResults =
    await api.functional.discussionBoard.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          size_min: 100,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(sizeMinResults);
  // Test size filtering - maximum size
  const sizeMaxResults =
    await api.functional.discussionBoard.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          size_max: 1000,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(sizeMaxResults);
  // Test date filtering - created_after
  const createdAfter = new Date(Date.now() - 86400000).toISOString(); // 24 hours ago
  const dateAfterResults =
    await api.functional.discussionBoard.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          created_after: createdAfter,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(dateAfterResults);
  // Test date filtering - created_before
  const createdBefore = new Date().toISOString();
  const dateBeforeResults =
    await api.functional.discussionBoard.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          created_before: createdBefore,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(dateBeforeResults);
  // Test combined filters
  const combinedResults =
    await api.functional.discussionBoard.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          size_min: 50,
          size_max: 5000,
          created_after: createdAfter,
          created_before: createdBefore,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Test pagination
  const paginatedResults =
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
  typia.assert(paginatedResults);
  // Test empty result set with impossible filter combination
  const emptyResults =
    await api.functional.discussionBoard.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          size_min: 1000000, // Impossible size
          size_max: 1000001,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals("empty result set", emptyResults.data.length, 0);
}
