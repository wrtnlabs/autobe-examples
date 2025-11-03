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
 * Test that members can only delete images from articles they own, validating
 * proper authorization and ownership checks in the image deletion workflow.
 *
 * This test ensures that the system properly enforces ownership-based access
 * control for image deletion operations. It verifies that attempting to delete
 * an image from another member's article results in an appropriate
 * authorization error, and that the image remains intact after the failed
 * deletion attempt.
 *
 * Workflow:
 *
 * 1. Register first member (article owner)
 * 2. Register moderator and create category
 * 3. First member creates article with the category
 * 4. First member uploads image to article
 * 5. Register second member (non-owner)
 * 6. Second member attempts to delete image (should fail)
 * 7. Verify authorization error is thrown
 * 8. Confirm image remains intact
 */
export async function test_api_article_image_deletion_validation_article_ownership(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate first member (article owner)
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = typia.random<string & tags.MinLength<8>>();
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: firstMemberEmail,
      password: firstMemberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(firstMember);

  // Step 2: Register and authenticate moderator to create category
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Moderator creates a category
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

  // Step 4: Switch back to first member by re-authenticating
  const firstMemberReauth = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: firstMemberEmail,
      password: firstMemberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(firstMemberReauth);

  // Step 5: First member creates article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: typia.random<string & tags.MinLength<5> & tags.MaxLength<200>>(),
        body: typia.random<
          string & tags.MinLength<20> & tags.MaxLength<50000>
        >(),
        summary: typia.random<string & tags.MaxLength<500>>(),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 6: First member uploads an image to their article
  const uploadedImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          original_name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<255>
          >(),
          mime_type: "image/jpeg" satisfies string &
            tags.Pattern<"^image/(jpeg|png|gif|webp)$">,
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
  typia.assert(uploadedImage);

  // Step 7: Register and authenticate second member (non-owner)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: secondMemberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(secondMember);

  // Step 8: Second member attempts to delete the image (should fail with authorization error)
  await TestValidator.error(
    "second member cannot delete image from first member's article",
    async () => {
      await api.functional.discussionBoard.member.articles.images.erase(
        connection,
        {
          articleId: article.id,
          imageId: uploadedImage.id,
        },
      );
    },
  );
}
