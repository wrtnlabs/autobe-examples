import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_image_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Prepare member connection and create account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      ip: null,
    },
  });
  // Step 2: Log in as member
  await authorize_member_login(memberConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  // Step 3: Create article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  // Step 4: Upload image to article
  const image =
    await generate_random_discussion_board_member_articles_images_post_by_articlecode(
      memberConnection,
      {
        body: {
          filename: "test-image.jpg",
          mimetype: "image/jpeg",
          size: 1024,
        },
        params: {
          articleCode: article.code,
        },
      },
    );
  // Step 5: Prepare admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "adminpassword",
      href: "https://example.com/admin",
      referrer: "https://example.com/admin/login",
    },
  });
  // Step 6: Delete image
  await api.functional.discussionBoard.admin.articles.images.eraseByArticlecodeAndImagecode(
    adminConnection,
    {
      articleCode: article.code,
      imageCode: image.id,
    },
  );
}
