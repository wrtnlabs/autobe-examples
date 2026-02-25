import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_admin_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_image_retrieval_admin(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create an article
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create image attachment with metadata
  const imageCreate = {
    attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    caption: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardArticleFile.ICreate;
  const image =
    await generate_random_discussion_board_admin_articles_images_create(
      adminConnection,
      {
        body: imageCreate,
        params: { articleId: article.id },
      },
    );
  typia.assert(image);
  // Retrieve the image metadata
  const retrievedImage =
    await api.functional.discussionBoard.admin.articles.images.at(
      adminConnection,
      {
        articleId: article.id,
        imageId: image.id,
      },
    );
  typia.assert(retrievedImage);
  // Validate response matches uploaded metadata
  TestValidator.equals("image ID matches", retrievedImage.id, image.id);
  TestValidator.equals(
    "display order matches",
    retrievedImage.display_order,
    imageCreate.display_order,
  );
  TestValidator.equals(
    "alt text matches",
    retrievedImage.alt_text,
    imageCreate.alt_text,
  );
  TestValidator.equals(
    "caption matches",
    retrievedImage.caption,
    imageCreate.caption,
  );
  TestValidator.equals("status is active", retrievedImage.status, "active");
  // Validate article relationship
  TestValidator.equals(
    "article ID matches",
    retrievedImage.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title matches",
    retrievedImage.article.title,
    article.title,
  );
  // Validate attachment file reference
  typia.assert(retrievedImage.attachment_file);
  TestValidator.predicate(
    "attachment file has valid metadata",
    retrievedImage.attachment_file.id === imageCreate.attachment_file_id &&
      retrievedImage.attachment_file.filename.length > 0 &&
      retrievedImage.attachment_file.file_size > 0,
  );
}
