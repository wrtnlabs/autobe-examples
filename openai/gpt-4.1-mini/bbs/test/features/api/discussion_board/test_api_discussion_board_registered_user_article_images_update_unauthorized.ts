import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleImageRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImageRequest";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_registered_user_article_images_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // Test rejection of article images update by a registered user who is NOT the article owner (unauthorized access).
  // Steps:
  // 1. Authenticate as registered user (join) as non-owner.
  // 2. Create an article as owner with first user.
  // 3. Attempt to update images on the article using PATCH with the non-owner user token.
  // 4. Verify server rejects request with HTTP 403 Forbidden error.
  // 5. Confirm authorization prevents unauthorized image updates.
  // 1. Register and login owner user
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerUser = await authorize_registered_user_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OwnerPassword123!",
    },
  });
  // Create article as owner
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      ownerConnection,
      {
        body: {
          title: "Owner's Article",
          content: "Content by owner",
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // 2. Register and login non-owner user
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerUser = await authorize_registered_user_join(
    nonOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "NonOwnerPassword123!",
      },
    },
  );
  // 3. Attempt to update images on the owner's article using non-owner token
  const updateImagesBody: IDiscussionBoardArticleImage.IRequest = {
    data: [
      {
        imageUrl: "https://example.com/new-image.jpg",
        description: "Unauthorized update attempt",
        displayOrder: 0,
      },
    ],
    page: 1,
    limit: 10,
  };
  await TestValidator.httpError(
    "reject unauthorized article images update",
    403,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.images.updateImages(
        nonOwnerConnection,
        {
          articleId: article.id,
          body: updateImagesBody,
        },
      );
    },
  );
}
