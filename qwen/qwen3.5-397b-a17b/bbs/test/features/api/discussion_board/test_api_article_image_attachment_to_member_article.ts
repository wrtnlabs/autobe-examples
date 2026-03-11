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
import { generate_random_discussion_board_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_admin_articles_images_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test administrator's ability to attach images to articles created by regular members.
 *
 * This test validates the authorization rule that administrators can add images to any article,
 * not just their own. The test workflow:
 * 1. Register and authenticate as administrator
 * 2. Register and authenticate as regular member
 * 3. Admin creates a section for article categorization
 * 4. Member creates an article in that section
 * 5. Admin attaches an image to the member's article
 *
 * Validations:
 * - Admin can successfully add image to another user's article
 * - Image metadata is stored correctly (name, size, type, url, width, height)
 * - Article author remains unchanged (still the member)
 * - Image references the correct article
 */
export async function test_api_article_image_attachment_to_member_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  typia.assert(adminAuth);
  // 2. Member registration and authentication
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
  // 3. Admin creates a section
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
        tags: [RandomGenerator.name(), RandomGenerator.name()],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Verify article author is the member
  TestValidator.equals(
    "article author is member",
    article.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "article section matches",
    article.section.id,
    section.id,
  );
  // 5. Admin attaches an image to the member's article
  const image =
    await generate_random_discussion_board_admin_articles_images_create(
      adminConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          name: `test-image-${RandomGenerator.alphabets(8)}.jpg`,
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<10000000>
          >(),
          type: "image/jpeg",
          url: `https://cdn.example.com/images/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
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
  // Validate image metadata
  TestValidator.equals("image article matches", image.article.id, article.id);
  TestValidator.predicate(
    "image has valid name",
    image.name.includes("test-image"),
  );
  TestValidator.predicate("image has valid size", image.size > 0);
  TestValidator.equals("image type is jpeg", image.type, "image/jpeg");
  TestValidator.predicate(
    "image has valid url",
    image.url.startsWith("https://"),
  );
  TestValidator.predicate("image has valid width", image.width > 0);
  TestValidator.predicate("image has valid height", image.height > 0);
  // Verify article author remains unchanged (still the member, not admin)
  TestValidator.notEquals(
    "article author is member not admin",
    article.author.id,
    adminAuth.member.id,
  );
}
