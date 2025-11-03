import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that the dual-key approach (articleId and imageId) properly validates
 * that an image belongs to the specified article, preventing unauthorized
 * access to images from different articles.
 *
 * This test validates a critical security requirement: ensuring that image
 * resources are properly isolated to their parent articles. The dual-key URL
 * pattern (/articles/{articleId}/images/{imageId}) must enforce that the
 * imageId actually belongs to the specified articleId.
 *
 * Workflow:
 *
 * 1. Create member account for article creation
 * 2. Create moderator account for category management
 * 3. Create category required for articles
 * 4. Create Article A as member
 * 5. Upload image to Article A
 * 6. Create Article B as member
 * 7. Upload image to Article B
 * 8. Attempt to retrieve Article A's image using Article B's articleId
 * 9. Validate that appropriate error is returned (cross-article access denied)
 * 10. Verify correct access when using proper articleId
 */
export async function test_api_article_image_detail_cross_article_validation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create moderator account for category creation
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create category required for articles
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<255>
          >(),
          description: typia.random<string & tags.MaxLength<2000>>(),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create Article A as member
  const articleA = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: typia.random<string & tags.MinLength<5> & tags.MaxLength<200>>(),
        body: typia.random<
          string & tags.MinLength<20> & tags.MaxLength<50000>
        >(),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(articleA);

  // Step 5: Upload image to Article A
  const imageA =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: articleA.id,
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          original_name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<255>
          >(),
          mime_type: typia.random<
            string & tags.Pattern<"^image/(jpeg|png|gif|webp)$">
          >(),
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<5242880>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
          >(),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(imageA);

  // Step 6: Create Article B as member
  const articleB = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: typia.random<string & tags.MinLength<5> & tags.MaxLength<200>>(),
        body: typia.random<
          string & tags.MinLength<20> & tags.MaxLength<50000>
        >(),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(articleB);

  // Step 7: Upload image to Article B
  const imageB =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: articleB.id,
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          original_name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<255>
          >(),
          mime_type: typia.random<
            string & tags.Pattern<"^image/(jpeg|png|gif|webp)$">
          >(),
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<5242880>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
          >(),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(imageB);

  // Step 8: Attempt to retrieve Article A's image using Article B's articleId (cross-article access)
  // This should fail because imageA.id belongs to articleA, not articleB
  await TestValidator.error(
    "cross-article image access should be denied",
    async () => {
      await api.functional.discussionBoard.articles.images.at(connection, {
        articleId: articleB.id,
        imageId: imageA.id,
      });
    },
  );

  // Step 9: Verify correct access when using proper articleId
  const retrievedImageA =
    await api.functional.discussionBoard.articles.images.at(connection, {
      articleId: articleA.id,
      imageId: imageA.id,
    });
  typia.assert(retrievedImageA);

  // Step 10: Validate that the retrieved image matches the original
  TestValidator.equals(
    "retrieved image ID matches original",
    retrievedImageA.id,
    imageA.id,
  );
  TestValidator.equals(
    "retrieved image belongs to correct article",
    retrievedImageA.discussion_board_article_id,
    articleA.id,
  );
}
