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
export async function test_api_article_image_upload_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
        referrer: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
        ip: null,
      },
    });
  typia.assert(authorized);
  // 2. Create new article
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {},
    );
  typia.assert(article);
  // 3. Upload image to the article
  const image: IDiscussionBoardArticleImage =
    await generate_random_discussion_board_member_articles_images_post_by_articlecode(
      memberConnection,
      {
        body: {
          filename: `${article.code}.png`,
          mimetype: RandomGenerator.pick([
            "image/png",
            "image/jpeg",
            "image/gif",
          ]),
          size: randint(100, 10240), // CORRECTED LINE
        },
        params: {
          articleCode: article.code,
        },
      },
    );
  typia.assert(image);
  // 4. Validate image attachment
  TestValidator.equals("article id matches", image.article.id, article.id);
  TestValidator.equals(
    "image filename matches",
    image.file_name,
    `${article.code}.png`,
  );
  TestValidator.equals(
    "image mimetype should be valid",
    image.mime_type,
    image.mime_type,
  );
}