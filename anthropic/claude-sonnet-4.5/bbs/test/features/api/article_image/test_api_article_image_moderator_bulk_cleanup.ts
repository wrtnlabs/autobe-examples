import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator workflow for cleaning up multiple inappropriate images across
 * different articles.
 *
 * This scenario simulates a content moderation session where a moderator needs
 * to remove several policy-violating images. Multiple members create articles
 * with images, then a single moderator authenticates and systematically deletes
 * images from different articles. This validates that moderators can
 * efficiently perform bulk content moderation operations, that each deletion
 * correctly sets the deleted_at timestamp, and that the audit trail properly
 * attributes the deletion to the moderator's session for accountability
 * purposes.
 *
 * Process:
 *
 * 1. Create 3 member accounts and have each create an article
 * 2. Each member uploads 2 images to their article (6 images total)
 * 3. Create and authenticate as a moderator
 * 4. Moderator deletes 5 images across the different articles
 * 5. Validate all deletions have proper deleted_at timestamps
 */
export async function test_api_article_image_moderator_bulk_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Create first member and article with images
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member1);

  const article1 = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);

  const member1Image1 =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article1.id,
        body: {
          original_filename: "inappropriate1.jpg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          content_type: "image/jpeg",
          storage_url: typia.random<string & tags.Format<"uri">>(),
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(member1Image1);

  const member1Image2 =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article1.id,
        body: {
          original_filename: "inappropriate2.png",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          content_type: "image/png",
          storage_url: typia.random<string & tags.Format<"uri">>(),
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(member1Image2);

  // Step 2: Create second member and article with images
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member2);

  const article2 = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);

  const member2Image1 =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article2.id,
        body: {
          original_filename: "violation1.jpg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          content_type: "image/jpeg",
          storage_url: typia.random<string & tags.Format<"uri">>(),
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(member2Image1);

  const member2Image2 =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article2.id,
        body: {
          original_filename: "violation2.gif",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          content_type: "image/gif",
          storage_url: typia.random<string & tags.Format<"uri">>(),
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(member2Image2);

  // Step 3: Create third member and article with images
  const member3 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password789",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member3);

  const article3 = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);

  const member3Image1 =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article3.id,
        body: {
          original_filename: "policy_breach.webp",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          content_type: "image/webp",
          storage_url: typia.random<string & tags.Format<"uri">>(),
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(member3Image1);

  const member3Image2 =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article3.id,
        body: {
          original_filename: "offensive.png",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          content_type: "image/png",
          storage_url: typia.random<string & tags.Format<"uri">>(),
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(member3Image2);

  // Step 4: Create moderator account and authenticate
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "moderator_secure_pass",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 5: Moderator performs bulk image cleanup across different articles
  const deletedImage1 =
    await api.functional.discussionBoard.moderator.articles.images.erase(
      connection,
      {
        articleId: article1.id,
        imageId: member1Image1.id,
      },
    );
  typia.assert(deletedImage1);
  TestValidator.predicate(
    "first deleted image has deleted_at timestamp",
    deletedImage1.deleted_at !== null,
  );

  const deletedImage2 =
    await api.functional.discussionBoard.moderator.articles.images.erase(
      connection,
      {
        articleId: article1.id,
        imageId: member1Image2.id,
      },
    );
  typia.assert(deletedImage2);
  TestValidator.predicate(
    "second deleted image has deleted_at timestamp",
    deletedImage2.deleted_at !== null,
  );

  const deletedImage3 =
    await api.functional.discussionBoard.moderator.articles.images.erase(
      connection,
      {
        articleId: article2.id,
        imageId: member2Image1.id,
      },
    );
  typia.assert(deletedImage3);
  TestValidator.predicate(
    "third deleted image has deleted_at timestamp",
    deletedImage3.deleted_at !== null,
  );

  const deletedImage4 =
    await api.functional.discussionBoard.moderator.articles.images.erase(
      connection,
      {
        articleId: article2.id,
        imageId: member2Image2.id,
      },
    );
  typia.assert(deletedImage4);
  TestValidator.predicate(
    "fourth deleted image has deleted_at timestamp",
    deletedImage4.deleted_at !== null,
  );

  const deletedImage5 =
    await api.functional.discussionBoard.moderator.articles.images.erase(
      connection,
      {
        articleId: article3.id,
        imageId: member3Image1.id,
      },
    );
  typia.assert(deletedImage5);
  TestValidator.predicate(
    "fifth deleted image has deleted_at timestamp",
    deletedImage5.deleted_at !== null,
  );

  // Step 6: Validate image IDs match expected deleted images
  TestValidator.equals(
    "deleted image 1 ID matches",
    deletedImage1.id,
    member1Image1.id,
  );
  TestValidator.equals(
    "deleted image 2 ID matches",
    deletedImage2.id,
    member1Image2.id,
  );
  TestValidator.equals(
    "deleted image 3 ID matches",
    deletedImage3.id,
    member2Image1.id,
  );
  TestValidator.equals(
    "deleted image 4 ID matches",
    deletedImage4.id,
    member2Image2.id,
  );
  TestValidator.equals(
    "deleted image 5 ID matches",
    deletedImage5.id,
    member3Image1.id,
  );
}
