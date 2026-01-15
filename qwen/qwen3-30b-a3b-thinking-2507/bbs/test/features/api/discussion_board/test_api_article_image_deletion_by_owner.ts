import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_images_post_by_articlecode } from "../../../generate/generate_random_discussion_board_member_articles_images_post_by_articlecode";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_image_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  typia.assert(member);
  // Step 2: Create article with valid title and content (min 50 characters)
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 6 }) + " ".repeat(40), // Ensure title > 50 chars
        content: RandomGenerator.content({ paragraphs: 2 }), // Contains at least 50 characters by default
      },
    },
  );
  typia.assert(article);
  // Step 3: Attach image to article
  const attachment =
    await generate_random_discussion_board_member_articles_images_post_by_articlecode(
      memberConnection,
      {
        body: {
          filename: `image_${RandomGenerator.alphaNumeric(8)}.jpg`,
          mimetype: "image/jpeg",
          size: Math.floor(Math.random() * (10485760 - 1000 + 1)) + 1000, // 1KB to 10MB
        },
        params: { articleCode: article.code },
      },
    );
  typia.assert(attachment);
  // Step 4: Delete image
  const deletedImage =
    await api.functional.discussionBoard.member.articles.images.eraseByArticleidAndImageid(
      memberConnection,
      {
        articleId: article.id,
        imageId: attachment.id,
      },
    );
  typia.assert(deletedImage);
  // Step 5: Verify the image was deleted by checking the response
  TestValidator.equals(
    "Image should be deleted",
    deletedImage.id,
    attachment.id,
  );
}
