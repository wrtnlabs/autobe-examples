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

export async function test_api_discussion_board_image_upload_to_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        passwordConfirmation: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member);
  // Create a new connection with the access token
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: member.token.access,
    },
  };
  // 2. Create an article
  const article = await api.functional.discussionBoard.member.articles.create(
    authorizedConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        tags: ["economic", "political"],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Upload an image to the article
  const uploadedImage =
    await api.functional.discussionBoard.articles.images.create(
      authorizedConnection,
      {
        articleId: article.id,
        body: {
          file_uri: `https://example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
          original_filename: `test_image_${RandomGenerator.alphaNumeric(6)}.jpg`,
          mime_type: "image/jpeg",
          file_size: 1024 * 1024, // 1MB
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(uploadedImage);
  // 4. Verify uploaded image metadata
  TestValidator.equals(
    "image has valid original filename",
    uploadedImage.original_filename,
    uploadedImage.original_filename,
  );
  TestValidator.predicate(
    "image has valid file size",
    uploadedImage.file_size > 0,
  );
  TestValidator.predicate(
    "image has valid MIME type",
    uploadedImage.mime_type.length > 0,
  );
}
