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
 * Test that a member can retrieve image attachments from their own articles.
 *
 * Test Flow:
 * 1. Administrator creates a discussion section (sections require admin privileges)
 * 2. Member registers and authenticates via join
 * 3. Member creates an article with content and section assignment
 * 4. Member uploads one or more image attachments to their article
 * 5. Member retrieves a specific image attachment's details
 *
 * Validation Points:
 * - Member successfully accesses image metadata from their own article
 * - Response includes all image properties: id, article relation, name, size, type, url, width, height, timestamps
 * - Article summary in response shows correct author information matching the member
 * - File size and image dimensions are accurately stored and returned
 * - CDN URL is accessible and properly formatted
 *
 * Business Logic Verification:
 * - Member actors can access images on articles they authored
 * - Article ownership is verified through discussion_board_member_id matching
 * - Image attachment cascade relationship with parent article is maintained
 * - Soft delete status validation ensures only active images are accessible
 */
export async function test_api_article_image_member_own_article_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator creates a discussion section
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
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 2. Member registers and authenticates
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
  // 3. Member creates an article with section assignment
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // 4. Member uploads image attachment to their article
  const image =
    await generate_random_discussion_board_member_articles_images_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          name: RandomGenerator.name(),
          size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          type: typia.random<string & tags.Format<"byte">>(),
          url: typia.random<string & tags.Format<"uri">>(),
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(image);
  // 5. Member retrieves the specific image attachment's details
  const retrievedImage =
    await api.functional.discussionBoard.articles.images.at(memberConnection, {
      articleId: article.id,
      imageId: image.id,
    });
  typia.assert(retrievedImage);
  // Validate image properties
  TestValidator.equals("image id matches", retrievedImage.id, image.id);
  TestValidator.equals("image name matches", retrievedImage.name, image.name);
  TestValidator.equals("image size matches", retrievedImage.size, image.size);
  TestValidator.equals("image type matches", retrievedImage.type, image.type);
  TestValidator.equals("image url matches", retrievedImage.url, image.url);
  TestValidator.equals(
    "image width matches",
    retrievedImage.width,
    image.width,
  );
  TestValidator.equals(
    "image height matches",
    retrievedImage.height,
    image.height,
  );
  // Validate article relationship
  TestValidator.equals(
    "article id in image matches",
    retrievedImage.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title in image matches",
    retrievedImage.article.title,
    article.title,
  );
  // Validate author information matches the member
  TestValidator.equals(
    "author id matches member",
    retrievedImage.article.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "author display name matches",
    retrievedImage.article.author.display_name,
    memberAuth.display_name,
  );
  // Validate timestamps exist and are valid date-time format
  TestValidator.predicate(
    "created_at is valid date-time",
    () =>
      !isNaN(Date.parse(retrievedImage.created_at)) &&
      retrievedImage.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () =>
      !isNaN(Date.parse(retrievedImage.updated_at)) &&
      retrievedImage.updated_at.length > 0,
  );
  // Validate soft delete status (should be null for active image)
  TestValidator.equals(
    "deleted_at is null for active image",
    retrievedImage.deleted_at,
    null,
  );
}
