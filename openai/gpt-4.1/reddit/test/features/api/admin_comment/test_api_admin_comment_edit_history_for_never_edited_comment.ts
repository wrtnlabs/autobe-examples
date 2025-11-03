import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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
 * Ensure that retrieving the edit history for a comment with no edits returns
 * an empty list.
 *
 * Workflow:
 *
 * 1. Register an admin user (to retrieve edit history as admin)
 * 2. Register a normal user (who will create content)
 * 3. Create a community as the user
 * 4. Create a post in the community (user)
 * 5. Create a comment on the post (user)
 * 6. Retrieve edit history for the comment as admin
 * 7. Assert that the edit history list is empty, pagination is valid
 */
export async function test_api_admin_comment_edit_history_for_never_edited_comment(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(2),
        href: "https://admin.example.com/register",
        referrer: "https://admin.example.com/login",
        ip: undefined,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(2),
        href: "https://frontend.example.com/join",
        referrer: "https://frontend.example.com/register",
        ip: undefined,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 3. Create a community as the (current) user
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        text_body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 7,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. Create a comment on the post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.user.comments.create(connection, {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // 6. Retrieve edit history for the comment as admin
  const editHistoryPage: IPageICommunityPlatformCommentEditHistory =
    await api.functional.communityPlatform.admin.comments.editHistories.index(
      connection,
      {
        commentId: comment.id,
        body: {},
      },
    );
  typia.assert(editHistoryPage);

  // 7. Assert editHistoryPage.data is empty and pagination info is returned
  TestValidator.equals(
    "No edit history for never-edited comment",
    editHistoryPage.data.length,
    0,
  );
  TestValidator.equals(
    "Pagination records count matches",
    editHistoryPage.pagination.records,
    0,
  );
}
