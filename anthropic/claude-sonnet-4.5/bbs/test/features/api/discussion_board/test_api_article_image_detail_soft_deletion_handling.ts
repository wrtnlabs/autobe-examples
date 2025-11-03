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

export async function test_api_article_image_detail_soft_deletion_handling(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for article and image upload
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberJoinData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: memberEmail,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member = await api.functional.auth.member.join(connection, {
    body: memberJoinData,
  });
  typia.assert(member);

  // Step 2: Create a moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorJoinData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: moderatorEmail,
    password: moderatorPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorJoinData,
  });
  typia.assert(moderator);

  // Step 3: Create a category as moderator (required for article creation)
  const categoryData = {
    name: typia.random<string & tags.MinLength<1> & tags.MaxLength<255>>(),
    description: typia.random<string & tags.MaxLength<2000>>(),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member account and create an article
  await api.functional.auth.member.join(connection, {
    body: memberJoinData,
  });

  const articleData = {
    title: typia.random<string & tags.MinLength<5> & tags.MaxLength<200>>(),
    body: typia.random<string & tags.MinLength<20> & tags.MaxLength<50000>>(),
    summary: typia.random<string & tags.MaxLength<500>>(),
    category_ids: [category.id] satisfies (string & tags.Format<"uuid">)[] &
      tags.MinItems<1> &
      tags.MaxItems<3>,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 5: Upload an image to the article
  const imageData = {
    url: typia.random<string & tags.Format<"uri">>(),
    original_name: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<255>
    >(),
    mime_type: "image/jpeg" satisfies string &
      tags.Pattern<"^image/(jpeg|png|gif|webp)$">,
    size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
    >(),
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
    >(),
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const uploadedImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: imageData,
      },
    );
  typia.assert(uploadedImage);

  // Step 6: Verify the image can be retrieved successfully without authentication
  const unauthenticatedConnection = { ...connection, headers: {} };

  const imageBeforeDeletion =
    await api.functional.discussionBoard.articles.images.at(
      unauthenticatedConnection,
      {
        articleId: article.id,
        imageId: uploadedImage.id,
      },
    );
  typia.assert(imageBeforeDeletion);
  TestValidator.equals(
    "retrieved image ID matches uploaded image",
    imageBeforeDeletion.id,
    uploadedImage.id,
  );

  // Step 7: Soft-delete the image as member
  await api.functional.discussionBoard.member.articles.images.erase(
    connection,
    {
      articleId: article.id,
      imageId: uploadedImage.id,
    },
  );

  // Step 8: Attempt to retrieve the soft-deleted image without authentication and validate error
  await TestValidator.error(
    "soft-deleted image should return error on retrieval",
    async () => {
      await api.functional.discussionBoard.articles.images.at(
        unauthenticatedConnection,
        {
          articleId: article.id,
          imageId: uploadedImage.id,
        },
      );
    },
  );
}
