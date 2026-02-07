import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_images_create } from "../../../generate/generate_random_discussion_board_member_articles_images_create";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_image_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Register admin account
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Step 3: Register member account
  await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Step 4: Login as member to get authorization
  await authorize_member_login(memberConnection, {
    body: typia.random<IDiscussionBoardMember.ILogin>(),
  });
  // Step 5: Create a section for the article
  const sectionId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 6: Create an article as member using the generate utility
  const article =
    await generate_random_discussion_board_member_sections_articles_create(
      memberConnection,
      {
        body: {},
        params: { sectionId },
      },
    );
  typia.assert(article);
  // Step 7: Upload image to the article as member using the generate utility
  const image =
    await generate_random_discussion_board_member_articles_images_create(
      memberConnection,
      {
        body: {},
        params: { articleId: (article as any).id },
      },
    );
  typia.assert(image);
  // Step 8: Login as admin to get admin privileges
  await authorize_admin_login(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  // Step 9: Delete the image as admin (admin override permission)
  await api.functional.discussionBoard.member.articles.images.eraseImage(
    adminConnection,
    {
      articleId: (article as any).id,
      imageId: (image as any).id,
    },
  );
  // Step 10: Validate the deletion was successful (no error thrown means success)
  TestValidator.predicate(
    "admin successfully deleted member's article image",
    true,
  );
}
