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
import { generate_random_discussion_board_member_articles_images_create } from "../../../generate/generate_random_discussion_board_member_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that an administrator can retrieve image attachments from any article for moderation purposes.
 *
 * This test verifies the admin moderation access pattern where administrators
 * can view image attachments on articles they don't own. The test creates a
 * complete workflow: admin creates section, member creates article with images,
 * and admin retrieves image metadata for moderation review.
 *
 * Test Flow:
 * 1. Administrator joins and authenticates
 * 2. Administrator creates a discussion section
 * 3. Member joins and authenticates
 * 4. Member creates an article in the section
 * 5. Member uploads an image attachment to the article
 * 6. Administrator retrieves the image details using the image ID
 *
 * Validation Points:
 * - Admin successfully accesses image from another user's article
 * - All image metadata fields are present and valid
 * - Article author is the member (not the admin)
 * - Image URL, dimensions, and file info are accurate
 * - No authorization errors for admin access
 */
export async function test_api_article_image_admin_moderation_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Administrator creates a discussion section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Member setup - join and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 4. Member creates an article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 6,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
        tags: [RandomGenerator.name(1), RandomGenerator.name(1)],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Member uploads an image attachment to the article
  const image =
    await generate_random_discussion_board_member_articles_images_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          name: `test-image-${RandomGenerator.alphabets(8)}.jpg`,
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<10000000>
          >(),
          type: "image/jpeg",
          url: typia.random<string & tags.Format<"uri">>(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(image);
  // 6. Administrator retrieves the image details for moderation
  const adminRetrievedImage =
    await api.functional.discussionBoard.articles.images.at(adminConnection, {
      articleId: article.id,
      imageId: image.id,
    });
  typia.assert(adminRetrievedImage);
  // Validation: Verify admin can access member's image
  TestValidator.equals("image ID matches", adminRetrievedImage.id, image.id);
  TestValidator.equals(
    "image name matches",
    adminRetrievedImage.name,
    image.name,
  );
  TestValidator.equals(
    "image size matches",
    adminRetrievedImage.size,
    image.size,
  );
  TestValidator.equals(
    "image type matches",
    adminRetrievedImage.type,
    image.type,
  );
  TestValidator.equals("image URL matches", adminRetrievedImage.url, image.url);
  TestValidator.equals(
    "image width matches",
    adminRetrievedImage.width,
    image.width,
  );
  TestValidator.equals(
    "image height matches",
    adminRetrievedImage.height,
    image.height,
  );
  // Validation: Verify article author is the member (not admin)
  TestValidator.equals(
    "article author is member",
    article.author.id,
    memberAuth.id,
  );
  TestValidator.predicate("author is not admin", !article.author.is_admin);
  // Validation: Verify image metadata completeness
  TestValidator.predicate(
    "image has valid URL",
    adminRetrievedImage.url.length > 0,
  );
  TestValidator.predicate(
    "image has positive dimensions",
    adminRetrievedImage.width > 0 && adminRetrievedImage.height > 0,
  );
  TestValidator.predicate(
    "image has positive size",
    adminRetrievedImage.size > 0,
  );
}
