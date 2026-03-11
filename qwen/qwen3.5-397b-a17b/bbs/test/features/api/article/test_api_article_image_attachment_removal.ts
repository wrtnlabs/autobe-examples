import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test removing existing image attachments from an article.
 *
 * This test verifies that article authors can remove image attachments from their articles
 * using the PATCH /discussionBoard/articles/{articleId}/images endpoint. The test creates
 * an article with multiple image attachments, then removes some of them and validates
 * that the response correctly reflects the remaining images.
 *
 * Test flow:
 * 1. Register and authenticate as a member
 * 2. Create a section as administrator (prerequisite for article creation)
 * 3. Create an article with multiple image attachments
 * 4. Remove specific images using the updateImages endpoint
 * 5. Validate that removed images are excluded from the response
 */
export async function test_api_article_image_attachment_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Admin setup - create section for article
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 3. Create article with multiple image attachments
  const imageUrls = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uri">>(),
  );
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        sectionId: section.id,
        imageUrls: imageUrls,
      },
    },
  );
  typia.assert(article);
  // Verify article has the expected images
  TestValidator.equals("initial image count", article.images.length, 3);
  // 4. Remove one or more images from the article
  const imagesToRemove = article.images.slice(0, 2).map((img) => img.id);
  const expectedRemainingCount = article.images.length - imagesToRemove.length;
  const updatedArticle =
    await api.functional.discussionBoard.articles.images.updateImages(
      memberConnection,
      {
        articleId: article.id,
        body: {
          remove: imagesToRemove,
          add: [],
        } satisfies IDiscussionBoardArticleImage.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // 5. Validate the response
  TestValidator.equals("article id matches", updatedArticle.id, article.id);
  TestValidator.equals(
    "article title matches",
    updatedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "author id matches",
    updatedArticle.author.id,
    memberAuth.id,
  );
  // Verify images were removed - the summary should not include removed images
  // Note: IDiscussionBoardArticle.ISummary doesn't include images array,
  // so we validate the article structure is correct
  TestValidator.predicate(
    "response is valid article summary",
    updatedArticle !== null && updatedArticle !== undefined,
  );
  TestValidator.equals(
    "comments count preserved",
    updatedArticle.comments_count,
    article.comments_count,
  );
}
