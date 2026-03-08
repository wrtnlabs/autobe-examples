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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test listing comments on an article with no comments.
 *
 * 1. Admin creates a section for article categorization
 * 2. Member creates an article without any comments
 * 3. List comments on the article - expect empty data array with correct pagination
 * 4. Verify pagination metadata: records=0, pages=0, data=[]
 * 5. Test 404 error for non-existent article
 */
export async function test_api_comment_list_empty_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Member setup - create article
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberAuth.email,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  const article = await generate_random_discussion_board_member_articles_create(
    memberLoginConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. List comments on the article (should be empty)
  const commentList =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(commentList);
  // 4. Validate pagination metadata for empty result
  TestValidator.equals(
    "pagination current page",
    commentList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", commentList.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count",
    commentList.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count",
    commentList.pagination.pages,
    0,
  );
  TestValidator.equals(
    "comments data array length",
    commentList.data.length,
    0,
  );
  // 5. Test 404 for non-existent article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent article returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.articles.comments.index(connection, {
        articleId: nonExistentArticleId,
        body: {} satisfies IDiscussionBoardComment.IRequest,
      });
    },
  );
}
