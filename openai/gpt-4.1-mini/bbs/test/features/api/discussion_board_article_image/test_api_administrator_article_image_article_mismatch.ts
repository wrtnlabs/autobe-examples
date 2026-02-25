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

export async function test_api_administrator_article_image_article_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval of an image where the imageId exists but belongs to a different article than the specified articleId using administrator credentials. Verify the API returns 404 Not Found since image and article do not match. Confirm enforcement of administrator authentication.
  // 1. Register and login administrator
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!",
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const adminJoinResult = await authorize_administrator_join(
    { host: connection.host },
    { body: adminJoinBody },
  );
  typia.assert(adminJoinResult);
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "http://localhost/login",
    referrer: "http://localhost/",
  } satisfies IDiscussionBoardAdministrator.ILogin;
  const adminLoginResult = await authorize_administrator_login(
    { host: connection.host },
    { body: adminLoginBody },
  );
  typia.assert(adminLoginResult);
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminLoginResult.token.access}` },
  };
  // 2. Register and login two different registered users
  // User 1
  const user1JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPass1234",
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  const user1 = await authorize_registered_user_join(
    { host: connection.host },
    { body: user1JoinBody },
  );
  typia.assert(user1);
  const user1LoginBody = {
    email: user1JoinBody.email,
    password: user1JoinBody.password,
  } satisfies IDiscussionBoardRegisteredUser.ILogin;
  const user1Login = await authorize_registered_user_login(
    { host: connection.host },
    { body: user1LoginBody },
  );
  typia.assert(user1Login);
  const user1Connection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${user1Login.token.access}` },
  };
  // User 2
  const user2JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPass5678",
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  const user2 = await authorize_registered_user_join(
    { host: connection.host },
    { body: user2JoinBody },
  );
  typia.assert(user2);
  const user2LoginBody = {
    email: user2JoinBody.email,
    password: user2JoinBody.password,
  } satisfies IDiscussionBoardRegisteredUser.ILogin;
  const user2Login = await authorize_registered_user_login(
    { host: connection.host },
    { body: user2LoginBody },
  );
  typia.assert(user2Login);
  const user2Connection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${user2Login.token.access}` },
  };
  // 3. User 1 creates an article
  const article1 =
    await generate_random_discussion_board_registered_user_articles_create(
      user1Connection,
      { body: {} },
    );
  typia.assert(article1);
  // 4. User 2 creates an article
  const article2 =
    await generate_random_discussion_board_registered_user_articles_create(
      user2Connection,
      { body: {} },
    );
  typia.assert(article2);
  // 5. User 1 attaches an image to their article
  const image1 =
    await generate_random_discussion_board_registered_user_articles_images_create_image(
      user1Connection,
      {
        params: { articleId: article1.id },
        body: {
          imageUrl: `https://example.com/image1.jpg`,
          description: "User1's image",
          displayOrder: 1,
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(image1);
  // 6. User 2 attaches an image to their article
  const image2 =
    await generate_random_discussion_board_registered_user_articles_images_create_image(
      user2Connection,
      {
        params: { articleId: article2.id },
        body: {
          imageUrl: `https://example.com/image2.jpg`,
          description: "User2's image",
          displayOrder: 1,
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(image2);
  // 7. Administrator tries to retrieve image1 with article2's articleId, expect 404
  await TestValidator.httpError(
    "image-article mismatch returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.articles.images.atImage(
        adminConnection,
        { articleId: article2.id, imageId: image1.id },
      );
    },
  );
}
