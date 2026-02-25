import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_images_create } from "../../../generate/generate_random_discussion_board_user_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_file_metadata_update_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate User A
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuthorized = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(userAAuthorized);
  // Step 2: User A creates an article
  const article = await api.functional.discussionBoard.user.articles.create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Step 3: User A uploads a file attachment (image) to the article
  const fileAttachment =
    await api.functional.discussionBoard.user.articles.images.create(
      userAConnection,
      {
        articleId: article.id,
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(fileAttachment);
  // Step 4: Create and authenticate User B
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuthorized = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(userBAuthorized);
  // Step 5: User B attempts to update the file metadata from User A's article
  await TestValidator.httpError(
    "Non-author cannot update file metadata",
    403,
    async () =>
      await api.functional.discussionBoard.user.articles.files.patchByArticleid(
        userBConnection,
        {
          articleId: article.id,
          body: {
            display_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            caption: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardArticleFile.IUpdate,
        },
      ),
  );
  // Step 6: Verify that only the article author (User A) can update the file
  // This step validates the security boundary by showing the same update works for the author
  const updatedFile =
    await api.functional.discussionBoard.user.articles.files.patchByArticleid(
      userAConnection,
      {
        articleId: article.id,
        body: {
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleFile.IUpdate,
      },
    );
  typia.assert(updatedFile);
  TestValidator.equals(
    "File ID remains unchanged",
    updatedFile.id,
    fileAttachment.id,
  );
  TestValidator.notEquals(
    "Display order should be updated",
    updatedFile.display_order,
    fileAttachment.display_order,
  );
}
