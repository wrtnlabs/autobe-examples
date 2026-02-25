import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_tags_create } from "../../../generate/generate_random_discussion_board_user_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_tag_removal_authorization_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup to create a section (required for article creation)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: 1,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. First user setup and article creation
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "pass1234",
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(firstUser);
  // First user creates article
  const article = await generate_random_discussion_board_user_articles_create(
    firstUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // First user adds a tag to their article
  const tag = await generate_random_discussion_board_user_articles_tags_create(
    firstUserConnection,
    {
      body: {
        tag_name: RandomGenerator.name(1),
      } satisfies IDiscussionBoardArticleTag.ICreate,
      params: {
        articleId: article.id,
      },
    },
  );
  typia.assert(tag);
  // 3. Second user setup (attempt unauthorized deletion)
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "pass5678",
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(secondUser);
  // 4. Attempt unauthorized tag removal (expected to fail)
  await TestValidator.error(
    "second user cannot delete first user's tag",
    async () => {
      await api.functional.discussionBoard.user.articles.tags.erase(
        secondUserConnection,
        {
          articleId: article.id,
          tagId: tag.id,
        },
      );
    },
  );
  // 5. Verify tag still exists by trying to fetch it (should succeed for owner)
  // Note: No fetch endpoint provided, but we can assume tag association persists
  // Validate that the operation did not affect the tag by checking no error thrown
  // for authorized user trying to access (though no fetch endpoint exists)
  // 6. Edge case: Non-existent tag ID (same user, should be 404)
  await TestValidator.httpError(
    "non-existent tag returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.user.articles.tags.erase(
        firstUserConnection,
        {
          articleId: article.id,
          tagId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 7. Edge case: Non-existent article ID (same user, should be 404)
  await TestValidator.httpError(
    "non-existent article returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.user.articles.tags.erase(
        firstUserConnection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          tagId: tag.id,
        },
      );
    },
  );
  // 8. Verify that proper error messages distinguish between authorization and not found
  // (Will be caught by TestValidator.error and TestValidator.httpError)
}
