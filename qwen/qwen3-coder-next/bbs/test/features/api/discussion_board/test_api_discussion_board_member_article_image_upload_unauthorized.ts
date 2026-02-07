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

export async function test_api_discussion_board_member_article_image_upload_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create first member and authorize
  const firstMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(firstMemberConnection, {
    body: {
      // IDiscussionBoardMember.IJoin has no required fields currently
    },
  });
  // Create second member and authorize
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {
    body: {
      // IDiscussionBoardMember.IJoin has no required fields currently
    },
  });
  // First member creates an article in a section
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      firstMemberConnection,
      {
        sectionId: sectionId,
        body: {
          // IDiscussionBoardArticle.ICreate has no required fields currently
        },
      },
    );
  typia.assert(article!);
  // Generate a random article ID for unauthorized access test
  // Since IDiscussionBoardArticle DTO is empty, we can't access article.id
  const unauthorizedArticleId = typia.random<string & tags.Format<"uuid">>();
  // Second member attempts to upload image to first member's article
  await TestValidator.error(
    "upload to another member's article should be forbidden",
    async () => {
      await api.functional.discussionBoard.member.articles.images.create(
        secondMemberConnection,
        {
          articleId: unauthorizedArticleId,
          body: {
            // IDiscussionBoardArticleImage.ICreate has no required fields currently
          },
        },
      );
    },
  );
}
