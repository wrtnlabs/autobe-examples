import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_bans_create } from "../../../generate/generate_random_discussion_board_bans_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_sections_create } from "../../../generate/generate_random_discussion_board_user_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_comment_creation_banned_user_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user and set up admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_user_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    },
  });
  typia.assert(adminAuth);
  // 2. Create a section for organizing articles (admin operation)
  const section = await generate_random_discussion_board_user_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 3. Create an article that will serve as target for the banned user's comment attempt
  const article = await generate_random_discussion_board_user_articles_create(
    adminConnection,
    {
      body: {
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // 4. Create second user who will be banned
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUserAuth = await authorize_user_join(bannedUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    },
  });
  typia.assert(bannedUserAuth);
  // 5. Admin bans the second user
  // Note: This requires the first user to have admin privileges
  // In a test environment, this may be seeded or configured
  const ban = await generate_random_discussion_board_bans_create(
    adminConnection,
    {
      body: {
        userId: bannedUserAuth.id,
        reason: "Violating community guidelines - test ban",
      },
    },
  );
  typia.assert(ban);
  // Validate ban was created correctly
  TestValidator.equals(
    "banned user ID matches",
    ban.user.id,
    bannedUserAuth.id,
  );
  TestValidator.equals(
    "ban reason recorded",
    ban.reason,
    "Violating community guidelines - test ban",
  );
  // 6. Banned user attempts to create a comment - must be rejected with 403 Forbidden
  await TestValidator.httpError(
    "banned user cannot create comment",
    403,
    async () => {
      await generate_random_discussion_board_user_articles_comments_create(
        bannedUserConnection,
        {
          params: {
            articleId: article.id,
          },
        },
      );
    },
  );
}
