import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_files_create } from "../../../generate/generate_random_discussion_board_user_articles_files_create";
import { generate_random_discussion_board_user_articles_images_create_image } from "../../../generate/generate_random_discussion_board_user_articles_images_create_image";
import { generate_random_discussion_board_user_articles_tags_create } from "../../../generate/generate_random_discussion_board_user_articles_tags_create";
import { generate_random_discussion_board_user_sections_create } from "../../../generate/generate_random_discussion_board_user_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_detail_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 2. Create section
  const section = await generate_random_discussion_board_user_sections_create(
    userConnection,
    {},
  );
  typia.assert(section);
  // 3. Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // 4. Attach file
  const file =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(file);
  // 5. Attach image
  const image =
    await generate_random_discussion_board_user_articles_images_create_image(
      userConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(image);
  // 6. Associate tags
  const tagValue = RandomGenerator.alphaNumeric(10).toLowerCase();
  const articleWithTags =
    await generate_random_discussion_board_user_articles_tags_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: { value: tagValue },
      },
    );
  typia.assert(articleWithTags);
  // 7. Post comment
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(comment);
  // 8. Retrieve article details via target endpoint
  const retrieved = await api.functional.discussionBoard.articles.at(
    connection,
    { articleId: article.id },
  );
  typia.assert(retrieved);
  // 9. Validate response
  TestValidator.equals("article id", retrieved.id, article.id);
  TestValidator.equals("article title", retrieved.title, article.title);
  TestValidator.equals("article content", retrieved.content, article.content);
  TestValidator.equals("author id", retrieved.author.id, user.id);
  TestValidator.equals(
    "author displayName",
    retrieved.author.displayName,
    user.displayName,
  );
  TestValidator.equals("author email", retrieved.author.email, user.email);
  TestValidator.equals("section id", retrieved.section.id, section.id);
  TestValidator.equals("section name", retrieved.section.name, section.name);
  TestValidator.equals(
    "section description",
    retrieved.section.description,
    section.description,
  );
  TestValidator.predicate("files array has file", retrieved.files.length > 0);
  TestValidator.equals("file id", retrieved.files[0].id, file.id);
  TestValidator.equals(
    "file original_filename",
    retrieved.files[0].original_filename,
    file.original_filename,
  );
  TestValidator.equals(
    "file file_size",
    retrieved.files[0].file_size,
    file.file_size,
  );
  TestValidator.equals(
    "file mime_type",
    retrieved.files[0].mime_type,
    file.mime_type,
  );
  TestValidator.predicate(
    "images array has image",
    retrieved.images.length > 0,
  );
  TestValidator.equals("image id", retrieved.images[0].id, image.id);
  TestValidator.equals(
    "image original_filename",
    retrieved.images[0].original_filename,
    image.original_filename,
  );
  TestValidator.equals("image width", retrieved.images[0].width, image.width);
  TestValidator.equals(
    "image height",
    retrieved.images[0].height,
    image.height,
  );
  TestValidator.equals(
    "image mime_type",
    retrieved.images[0].mime_type,
    image.mime_type,
  );
  TestValidator.predicate("tags array has tag", retrieved.tags.length > 0);
  TestValidator.equals("comments_count", retrieved.comments_count, 1);
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
}
