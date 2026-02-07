import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_images_create } from "../../../generate/generate_random_discussion_board_member_articles_images_create";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_discussion_board_member_article_image_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 2. Create a section for the article
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create an article
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // 4. Upload a valid PNG image to the article
  const uploadedImage =
    await api.functional.discussionBoard.member.articles.images.create(
      memberConnection,
      {
        articleId: (article as any).id as string & tags.Format<"uuid">,
        body: {
          original_name: "test_image.png",
          stored_name: RandomGenerator.alphabets(16) + ".png",
          mime_type: "image/png",
          width: 800,
          height: 600,
          size: 102400,
          display_order: 1,
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(uploadedImage);
  // 5. Validate the uploaded image properties
  // Use type assertions to access properties that may not be defined in the DTO
  TestValidator.equals(
    "original name matches",
    (uploadedImage as any).original_name,
    "test_image.png",
  );
  TestValidator.predicate(
    "mime type is image/png",
    (uploadedImage as any).mime_type === "image/png",
  );
  TestValidator.equals("width matches", (uploadedImage as any).width, 800);
  TestValidator.equals("height matches", (uploadedImage as any).height, 600);
  TestValidator.equals("size matches", (uploadedImage as any).size, 102400);
  TestValidator.equals(
    "display order matches",
    (uploadedImage as any).display_order,
    1,
  );
}
