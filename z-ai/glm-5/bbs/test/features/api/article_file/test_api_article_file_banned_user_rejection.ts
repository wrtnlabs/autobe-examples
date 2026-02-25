import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_files_create } from "../../../generate/generate_random_discussion_board_user_articles_files_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

/**
 * Test that banned users cannot attach files to their articles.
 *
 * Workflow:
 * 1. User registers and creates an article
 * 2. Administrator bans the user
 * 3. Banned user attempts to attach a file
 * 4. System rejects with 403 Forbidden
 */
export async function test_api_article_file_banned_user_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a regular user who will be banned
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {});
  typia.assert(userAuth);
  // Step 2: User creates an article (utility handles sectionId internally)
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // Step 3: Create an administrator account for banning
  // Note: Test environment should provision users with appropriate permissions
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_user_join(adminConnection, {});
  typia.assert(adminAuth);
  // Step 4: Administrator bans the user
  const ban = await generate_random_discussion_board_bans_create(
    adminConnection,
    {
      body: {
        userId: userAuth.id,
        reason: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(ban);
  // Verify the ban was created for the correct user
  TestValidator.equals("banned user matches", ban.user.id, userAuth.id);
  // Step 5: Banned user attempts to attach a file - must be rejected
  await TestValidator.httpError(
    "banned user cannot attach files",
    403,
    async () => {
      await api.functional.discussionBoard.user.articles.files.create(
        userConnection,
        {
          articleId: article.id,
          body: {
            original_filename: "test_document.pdf",
            storage_path: "file://storage/test_document.pdf",
            file_size: 1024,
            mime_type: "application/pdf",
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    },
  );
}
