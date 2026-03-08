import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_comment_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Member setup - create account and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoin);
  // Login with credentials
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: memberJoin.email,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLogin);
  // 3. Create article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Create 15 comments to test pagination
  const commentContents = ArrayUtil.repeat(
    15,
    (index) =>
      `Comment ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
  );
  const createdComments: IDiscussionBoardComment[] = await ArrayUtil.asyncMap(
    commentContents,
    async (content, index) =>
      generate_random_discussion_board_member_articles_comments_create(
        memberConnection,
        {
          body: {
            content,
          } satisfies IDiscussionBoardComment.ICreate,
          params: {
            articleId: article.id,
          },
        },
      ),
  );
  typia.assert(createdComments);
  // 5. Test pagination with different configurations
  // Test case 1: Page 1, limit 5 (should return 5 comments)
  const page1Limit5 =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(page1Limit5);
  TestValidator.equals(
    "page 1 limit 5 - current page",
    page1Limit5.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 5 - limit",
    page1Limit5.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 1 limit 5 - total records",
    page1Limit5.pagination.records,
    15,
  );
  TestValidator.equals(
    "page 1 limit 5 - total pages",
    page1Limit5.pagination.pages,
    3,
  );
  TestValidator.equals(
    "page 1 limit 5 - data count",
    page1Limit5.data.length,
    5,
  );
  // Test case 2: Page 2, limit 5 (should return 5 comments)
  const page2Limit5 =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(page2Limit5);
  TestValidator.equals(
    "page 2 limit 5 - current page",
    page2Limit5.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit 5 - data count",
    page2Limit5.data.length,
    5,
  );
  // Test case 3: Page 3, limit 5 (should return 5 comments - last page)
  const page3Limit5 =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 3,
          limit: 5,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(page3Limit5);
  TestValidator.equals(
    "page 3 limit 5 - current page",
    page3Limit5.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 limit 5 - data count",
    page3Limit5.data.length,
    5,
  );
  // Test case 4: Page 1, limit 1 (edge case - minimal pagination)
  const page1Limit1 =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(page1Limit1);
  TestValidator.equals(
    "page 1 limit 1 - current page",
    page1Limit1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 1 - limit",
    page1Limit1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "page 1 limit 1 - total pages",
    page1Limit1.pagination.pages,
    15,
  );
  TestValidator.equals(
    "page 1 limit 1 - data count",
    page1Limit1.data.length,
    1,
  );
  // Test case 5: Page 15, limit 1 (last page with minimal limit)
  const page15Limit1 =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 15,
          limit: 1,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(page15Limit1);
  TestValidator.equals(
    "page 15 limit 1 - current page",
    page15Limit1.pagination.current,
    15,
  );
  TestValidator.equals(
    "page 15 limit 1 - data count",
    page15Limit1.data.length,
    1,
  );
  // Test case 6: Default pagination (no page/limit specified)
  const defaultPagination =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(defaultPagination);
  TestValidator.equals(
    "default - total records",
    defaultPagination.pagination.records,
    15,
  );
  TestValidator.predicate(
    "default - has data",
    defaultPagination.data.length > 0,
  );
}
