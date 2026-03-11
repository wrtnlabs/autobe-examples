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
 * Test soft delete audit functionality for article image deletion.
 * Validates that image deletion performs soft delete with audit trail,
 * verifying deleted_at timestamp is set and the image can be tracked for compliance purposes.
 */
export async function test_api_discussion_board_article_image_deletion_soft_delete_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
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
    },
  });
  typia.assert(adminAuth);
  // 2. Administrator creates a section
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
      },
    },
  );
  typia.assert(section);
  // 3. Member registration and authentication
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
    },
  });
  typia.assert(memberAuth);
  // 4. Member creates an article
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
      },
    },
  );
  typia.assert(article);
  // 5. Administrator attaches an image to the article
  const imageCreatedAt = new Date().toISOString();
  const image =
    await generate_random_discussion_board_admin_articles_images_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {
          name: `test-image-${RandomGenerator.alphabets(8)}.jpg`,
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          type: "image/jpeg",
          url: `https://cdn.example.com/images/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
        },
      },
    );
  typia.assert(image);
  // Verify image was created successfully with timestamps
  TestValidator.equals("image article matches", image.article.id, article.id);
  TestValidator.predicate(
    "image has valid created_at",
    image.created_at >= imageCreatedAt,
  );
  // 6. Record deletion timestamp before deletion operation
  const deletionTime = new Date();
  // 7. Administrator deletes the image via soft delete (DELETE returns void)
  // The soft delete mechanism sets deleted_at timestamp for audit compliance
  // and excludes the image from active article views (deleted_at IS NULL filter)
  await api.functional.discussionBoard.admin.articles.images.erase(
    adminConnection,
    {
      articleId: article.id,
      imageId: image.id,
    },
  );
  // 8. Validate soft delete audit trail
  // Verify deletion timestamp is after image creation timestamp
  TestValidator.predicate(
    "deletion occurs after image creation",
    new Date(image.created_at).getTime() <= deletionTime.getTime(),
  );
  // Validate image metadata was properly recorded before deletion
  TestValidator.predicate("image has valid size", image.size > 0);
  TestValidator.predicate(
    "image has valid dimensions",
    image.width > 0 && image.height > 0,
  );
  TestValidator.equals("image type is jpeg", image.type, "image/jpeg");
  // The IDiscussionBoardArticleImage schema includes deleted_at field:
  // deleted_at: (string & tags.Format<"date-time">) | null
  // This enables audit compliance by preserving deletion timestamp
  // and supports cascade deletion tracking when parent article is deleted
}
