import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_images_create } from "../../../generate/generate_random_discussion_board_user_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_image_attachment_multiple_images_ordering(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const userJoined = await authorize_user_join(userConnection, {});
  typia.assert(userJoined);
  // Create article for image attachments using utility function
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.paragraph({ sentences: 5 }),
    discussion_board_section_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    { body: articleBody },
  );
  typia.assert(article);
  // Attach multiple images sequentially with increasing display order
  const imagesToAttach = 3;
  const attachedImages: IDiscussionBoardArticleFile[] = [];
  for (let i = 0; i < imagesToAttach; i++) {
    const imageBody = {
      attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
      display_order: i,
      alt_text: `Image ${i + 1} description`,
      caption: `Caption for image ${i + 1}`,
    } satisfies IDiscussionBoardArticleFile.ICreate;
    const attachedImage =
      await generate_random_discussion_board_user_articles_images_create(
        userConnection,
        {
          params: { articleId: article.id },
          body: imageBody,
        },
      );
    typia.assert(attachedImage);
    attachedImages.push(attachedImage);
  }
  // Validate display ordering
  TestValidator.equals(
    "correct number of images attached",
    attachedImages.length,
    imagesToAttach,
  );
  // Verify sequential display order
  for (let i = 0; i < attachedImages.length; i++) {
    TestValidator.equals(
      `image ${i} display order matches input`,
      attachedImages[i].display_order,
      i,
    );
    TestValidator.equals(
      `image ${i} belongs to correct article`,
      attachedImages[i].article.id,
      article.id,
    );
  }
  // Verify ordering integrity - each subsequent image should have higher display order
  for (let i = 1; i < attachedImages.length; i++) {
    TestValidator.predicate(
      `image ${i} has higher display order than image ${i - 1}`,
      attachedImages[i].display_order > attachedImages[i - 1].display_order,
    );
  }
  // Verify all images have proper metadata
  attachedImages.forEach((image, index) => {
    TestValidator.predicate(
      `image ${index} has attachment file reference`,
      !!image.attachment_file,
    );
    TestValidator.predicate(
      `image ${index} has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        image.id,
      ),
    );
  });
}
