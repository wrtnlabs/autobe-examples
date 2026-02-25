import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_images_create_image } from "../../../generate/generate_random_discussion_board_registered_user_articles_images_create_image";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test retrieval attempt of an article image with a valid articleId but a non-existent imageId by administrator.
 * Expects HTTP 404 Not Found error.
 */
export async function test_api_administrator_article_image_not_found(
  connection: IConnection,
): Promise<void> {
  // 1. Administrator join and login
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
  };
  const adminJoin = await authorize_administrator_join(
    { host: connection.host },
    { body: adminJoinBody },
  );
  typia.assert(adminJoin);
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "http://localhost/login",
    referrer: "http://localhost/referrer",
  };
  const adminLogin = await authorize_administrator_login(
    { host: connection.host },
    { body: adminLoginBody },
  );
  typia.assert(adminLogin);
  const adminConnection: IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${adminLogin.token.access}`,
  };
  // 2. RegisteredUser join and login
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPass123!",
  };
  const userJoin = await authorize_registered_user_join(
    { host: connection.host },
    { body: userJoinBody },
  );
  typia.assert(userJoin);
  const userLoginBody = {
    email: userJoinBody.email,
    password: userJoinBody.password,
  };
  const userLogin = await authorize_registered_user_login(
    { host: connection.host },
    { body: userLoginBody },
  );
  typia.assert(userLogin);
  const userConnection: IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: `Bearer ${userLogin.token.access}`,
  };
  // 3. RegisteredUser creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: undefined },
    );
  typia.assert(article);
  // 4. RegisteredUser attaches an image to the article
  const image =
    await generate_random_discussion_board_registered_user_articles_images_create_image(
      userConnection,
      {
        params: { articleId: article.id },
        body: undefined,
      },
    );
  typia.assert(image);
  // 5. Administrator attempts to retrieve a non-existent imageId for the article
  let nonExistentImageId = typia.random<string & tags.Format<"uuid">>();
  // Ensure nonExistentImageId differs from the existing image.id
  if (nonExistentImageId === image.id) {
    // Regenerate if collision occurs
    nonExistentImageId = typia.random<string & tags.Format<"uuid">>();
  }
  await TestValidator.httpError(
    "administrator attempts to retrieve a non-existent article image",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.articles.images.atImage(
        adminConnection,
        { articleId: article.id, imageId: nonExistentImageId },
      );
    },
  );
}
