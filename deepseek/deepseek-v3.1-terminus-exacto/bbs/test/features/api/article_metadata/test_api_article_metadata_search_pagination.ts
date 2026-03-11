import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleMetadatum";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleMetadatum";
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

export async function test_api_article_metadata_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
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
  // Create at least 30 articles for pagination testing
  const articles = await ArrayUtil.asyncRepeat(35, async () => {
    return await generate_random_discussion_board_member_articles_create(
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
  });
  // Test basic pagination
  const page1 =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current page is 1", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit is 10", page1.pagination.limit, 10);
  TestValidator.predicate("page 1 has data", page1.data.length > 0);
  TestValidator.predicate(
    "page 1 records count is valid",
    page1.pagination.records >= 35,
  );
  TestValidator.predicate(
    "page 1 pages count is valid",
    page1.pagination.pages >= Math.ceil(35 / 10),
  );
  // Test page 2
  const page2 =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current page is 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit is 10", page2.pagination.limit, 10);
  TestValidator.equals(
    "page 2 total records matches page 1",
    page2.pagination.records,
    page1.pagination.records,
  );
  // Test different limit values
  const limit5 =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(limit5);
  TestValidator.equals("limit 5 works correctly", limit5.pagination.limit, 5);
  TestValidator.predicate(
    "limit 5 has fewer items per page",
    limit5.data.length <= 5,
  );
  // Test last page
  const lastPage =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          page: page1.pagination.pages,
          limit: 10,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page has correct current page",
    lastPage.pagination.current,
    page1.pagination.pages,
  );
  TestValidator.predicate("last page has data", lastPage.data.length > 0);
  // Test pagination consistency
  TestValidator.notEquals(
    "page 1 and page 2 have different data",
    page1.data.map((d) => d.id),
    page2.data.map((d) => d.id),
  );
  // Test boundary limit values
  const limit1 =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(limit1);
  TestValidator.equals("limit 1 works correctly", limit1.pagination.limit, 1);
  const limit100 =
    await api.functional.discussionBoard.member.articles.metadata.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardArticleMetadatum.IRequest,
      },
    );
  typia.assert(limit100);
  TestValidator.equals(
    "limit 100 works correctly",
    limit100.pagination.limit,
    100,
  );
}
