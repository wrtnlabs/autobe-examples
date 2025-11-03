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
 * Test moderator uploading an image to a member-authored article.
 *
 * This test validates the cross-user content management workflow where
 * moderators can enhance member-created articles by adding visual supporting
 * materials. This capability is essential for content moderation and quality
 * improvement workflows.
 *
 * Workflow:
 *
 * 1. Create member account and moderator account
 * 2. Moderator creates category structure
 * 3. Member creates an article
 * 4. Moderator uploads image to the member's article
 * 5. Validate image attachment and moderator attribution
 */
export async function test_api_article_image_upload_by_moderator_to_member_article(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
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
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 2: Create moderator account
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
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
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Moderator creates category (moderator is already authenticated from join)
  const category: IDiscussionBoardCategory =
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

  // Step 4: Create unauthenticated connection and login as member to create article
  const memberConnection: api.IConnection = { ...connection, headers: {} };
  const memberLogin: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
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
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(memberLogin);

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: typia.random<
            string & tags.MinLength<5> & tags.MaxLength<200>
          >(),
          body: typia.random<
            string & tags.MinLength<20> & tags.MaxLength<50000>
          >(),
          summary: typia.random<string & tags.MaxLength<500>>(),
          category_ids: [category.id] satisfies (string &
            tags.Format<"uuid">)[] &
            tags.MinItems<1> &
            tags.MaxItems<3>,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 5: Moderator uploads image to member's article (using original moderator connection)
  const imageWidth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
  >();
  const imageHeight = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
  >();

  const uploadedImage: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.moderator.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          original_name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<255>
          >(),
          mime_type: RandomGenerator.pick([
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
          ] as const),
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<5242880>
          >(),
          width: imageWidth,
          height: imageHeight,
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(uploadedImage);

  // Step 6: Validate the upload
  TestValidator.equals(
    "image attached to correct article",
    uploadedImage.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "uploader is moderator",
    uploadedImage.uploaded_by_member_id,
    moderator.id,
  );
}
