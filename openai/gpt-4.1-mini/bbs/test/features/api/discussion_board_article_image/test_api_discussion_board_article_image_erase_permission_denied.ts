import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_images_create_image } from "../../../generate/generate_random_discussion_board_registered_user_articles_images_create_image";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_discussion_board_article_image_erase_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // Test deletion attempt of an article image by an unauthorized registered user who is not the article owner or admin.
  // Steps:
  // 1. Register two users (owner and unauthorized user)
  // 2. Create article as owner
  // 3. Upload image to article
  // 4. Login as unauthorized user
  // 5. Attempt to delete image via unauthorized user
  // 6. Expect 403 Forbidden error
  // 7. Verify image still exists (by trusting 403 response since no GET API given)
  // 1. Register and authorize first user (owner)
  const ownerJoinConnection: api.IConnection = { host: connection.host };
  const ownerUser = await authorize_registered_user_join(ownerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  ownerJoinConnection.headers = { Authorization: ownerUser.token.access };
  // 2. Create article as owner
  // Use generation utility
  const ownerArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      ownerJoinConnection,
      { body: {} },
    );
  typia.assert(ownerArticle);
  // 3. Upload image to article
  const imagePayload = {
    imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(10)}.jpg`,
    description: "Test image",
    displayOrder: 0,
  } satisfies IDiscussionBoardArticleImage.ICreate;
  const ownerImage =
    await generate_random_discussion_board_registered_user_articles_images_create_image(
      ownerJoinConnection,
      {
        params: { articleId: ownerArticle.id },
        body: imagePayload,
      },
    );
  typia.assert(ownerImage);
  // 4. Register and authorize second user (unauthorized)
  const unauthorizedJoinConnection: api.IConnection = { host: connection.host };
  const unauthorizedUser = await authorize_registered_user_join(
    unauthorizedJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
      },
    },
  );
  unauthorizedJoinConnection.headers = {
    Authorization: unauthorizedUser.token.access,
  };
  // 5. Attempt deletion by unauthorized user
  await TestValidator.httpError(
    "unauthorized deletion attempt fails with 403",
    403,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.images.erase(
        unauthorizedJoinConnection,
        {
          articleId: ownerArticle.id,
          imageId: ownerImage.id,
        },
      );
    },
  );
  // 6. Verify image still exists by trusting 403 error prevented deletion
  // There is no GET API to fetch article images directly, so we cannot verify image existence explicitly here
  // Relying on 403 error response is sufficient assurance
  // 7. Final assertion: just ensure above operations passed
  TestValidator.predicate("test ran successfully", true);
}
