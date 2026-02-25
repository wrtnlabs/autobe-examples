import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_articles_images_create } from "../../../generate/generate_random_discussion_board_articles_images_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_image_unauthorized_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A creates article with image
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberA);
  const article = await generate_random_discussion_board_member_articles_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  const articleId = article.id;
  const image = await generate_random_discussion_board_articles_images_create(
    memberAConnection,
    {
      body: {
        file_uri: "https://example.com/test-image.jpg",
        original_filename: "test-image.jpg",
        mime_type: "image/jpeg",
        file_size: 1024 * 1024,
      } satisfies IDiscussionBoardArticleImage.ICreate,
      params: { articleId: articleId },
    },
  );
  typia.assert(image);
  const imageId = image.id;
  // 2. Auth as member B (different user, not admin)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member B attempts to delete image from member A's article
  // Expected: HTTP 403 Forbidden with error message indicating insufficient permissions
  await TestValidator.error(
    "should reject unauthorized image deletion",
    async () => {
      await api.functional.discussionBoard.articles.images.eraseImage(
        memberBConnection,
        {
          articleId: articleId,
          imageId: imageId,
        },
      );
    },
  );
}
