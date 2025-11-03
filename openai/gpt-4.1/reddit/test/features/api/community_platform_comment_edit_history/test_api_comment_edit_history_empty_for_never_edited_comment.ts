import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEditHistory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentEditHistory";

/**
 * Validates that retrieving the edit history of a comment that has never been
 * edited returns an empty list.
 *
 * 1. Register a new user
 * 2. User creates a community
 * 3. User posts a text post in the community
 * 4. User creates a single top-level comment on the post
 * 5. Retrieve the edit history for this comment (before any edits)
 * 6. Assert the edit history data array is empty
 */
export async function test_api_comment_edit_history_empty_for_never_edited_comment(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
      ip: undefined,
      href: "https://test.community/join", // Faked registration origin
      referrer: "https://test.community/home",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // 2. User creates a community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(12).toLowerCase(),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. User creates a post
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 5 }),
        text_body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. User comments on the post
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 5. Retrieve edit history (should be empty)
  const editHistoryPage =
    await api.functional.communityPlatform.user.comments.editHistories.index(
      connection,
      {
        commentId: comment.id,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
          order_by: "asc",
        } satisfies ICommunityPlatformCommentEditHistory.IRequest,
      },
    );
  typia.assert(editHistoryPage);
  TestValidator.equals(
    "edit history for never-edited comment should be empty",
    editHistoryPage.data,
    [],
  );
}
