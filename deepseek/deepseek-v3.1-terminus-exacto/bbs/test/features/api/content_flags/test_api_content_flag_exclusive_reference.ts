import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_content_flag_exclusive_reference(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin actor with proper authentication flow
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "admin1234",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await api.functional.discussionBoard.auth.admin.login(
    authenticatedAdminConnection,
    {
      body: {
        email: adminJoin.email,
        password: "admin1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.ILogin,
    },
  );
  // Create section with authenticated admin
  const section = await api.functional.discussionBoard.admin.sections.create(
    authenticatedAdminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Setup user actor with proper authentication flow
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user1234",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(userJoin);
  const authenticatedUserConnection: api.IConnection = {
    host: connection.host,
  };
  await api.functional.discussionBoard.auth.user.login(
    authenticatedUserConnection,
    {
      body: {
        email: userJoin.email,
        password: "user1234",
      } satisfies IDiscussionBoardUser.ILogin,
    },
  );
  // Create test article with authenticated user
  const article = await api.functional.discussionBoard.user.articles.create(
    authenticatedUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create test comment with authenticated user
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      authenticatedUserConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Test 1: Flag only article (valid)
  const articleFlag =
    await api.functional.discussionBoard.user.content_flags.create(
      authenticatedUserConnection,
      {
        body: {
          flagged_article_id: article.id,
          flagged_comment_id: null,
          flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(articleFlag);
  // Test 2: Flag only comment (valid)
  const commentFlag =
    await api.functional.discussionBoard.user.content_flags.create(
      authenticatedUserConnection,
      {
        body: {
          flagged_article_id: null,
          flagged_comment_id: comment.id,
          flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(commentFlag);
  // Test 3: Flag both article and comment (invalid - should throw error)
  await TestValidator.error(
    "should reject flag with both article and comment",
    async () => {
      await api.functional.discussionBoard.user.content_flags.create(
        authenticatedUserConnection,
        {
          body: {
            flagged_article_id: article.id,
            flagged_comment_id: comment.id,
            flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardContentFlag.ICreate,
        },
      );
    },
  );
  // Test 4: Flag neither article nor comment (invalid - should throw error)
  await TestValidator.error(
    "should reject flag with neither article nor comment",
    async () => {
      await api.functional.discussionBoard.user.content_flags.create(
        authenticatedUserConnection,
        {
          body: {
            flagged_article_id: null,
            flagged_comment_id: null,
            flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardContentFlag.ICreate,
        },
      );
    },
  );
}
