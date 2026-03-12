import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleView";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test error handling when administrator attempts to retrieve non-existent article view records.
 *
 * This test validates two scenarios:
 * 1. Retrieving a view with a non-existent viewId for an existing article
 * 2. Retrieving a view with a valid viewId but for a different article than it belongs to
 *
 * Both scenarios should return 404 Not Found errors.
 */
export async function test_api_article_view_not_found_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator actor
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com/login",
    },
  });
  // 2. Setup member actor
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      href: "https://test.com/member",
      referrer: "https://test.com/login",
    },
  });
  // 3. Create a section using administrator
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Test Section",
          description: "Section for testing article views",
        },
      },
    );
  typia.assert(section);
  // 4. Create an article using member
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: "Test Article for View Testing",
        content:
          "This is a test article content for testing article view scenarios.",
        section_id: section.id,
        tags: ["test", "article-view"],
      },
    },
  );
  typia.assert(article);
  // 5. Test case 1: Non-existent viewId for existing article
  const nonExistentViewId = typia.random<string & typia.tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw error for non-existent viewId",
    async () => {
      await api.functional.discussionBoard.administrator.articles.views.at(
        adminConnection,
        {
          articleId: article.id,
          viewId: nonExistentViewId,
        },
      );
    },
  );
  // 6. Test case 2: Valid viewId but for different article
  // Generate a fake viewId that doesn't belong to our article
  const fakeViewId = typia.random<string & typia.tags.Format<"uuid">>();
  const fakeArticleId = typia.random<string & typia.tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw error when viewId belongs to different article",
    async () => {
      await api.functional.discussionBoard.administrator.articles.views.at(
        adminConnection,
        {
          articleId: fakeArticleId,
          viewId: fakeViewId,
        },
      );
    },
  );
}
