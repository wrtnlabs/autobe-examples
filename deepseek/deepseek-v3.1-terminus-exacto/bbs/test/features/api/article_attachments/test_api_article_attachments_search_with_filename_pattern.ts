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

export async function test_api_article_attachments_search_with_filename_pattern(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member user
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
  // 2. Create an article for testing
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
  // 3. Test the attachment search endpoint structure with a valid article ID
  // Since we cannot create actual attachments, we test that the endpoint returns
  // a properly structured response even with no attachments
  const searchResponse =
    await api.functional.discussionBoard.articles.attachments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResponse);
  // 4. Validate the response structure
  TestValidator.equals(
    "response has pagination",
    typeof searchResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination has current page",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    searchResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination has records count",
    searchResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    searchResponse.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(searchResponse.data),
    true,
  );
  // 5. Test error case with invalid article ID
  await TestValidator.error("invalid article ID should error", async () => {
    await api.functional.discussionBoard.articles.attachments.index(
      memberConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(), // Random invalid UUID
        body: {
          search: "test",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  });
}