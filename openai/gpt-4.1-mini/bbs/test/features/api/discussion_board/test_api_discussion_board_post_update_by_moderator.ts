import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validates that a moderator can update a discussion board post.
 *
 * This test covers the entire process of creating a moderator, admin, member,
 * category, post creation by member, role switching to moderator, and updating
 * the post with correct validation of updated contents.
 *
 * Steps:
 *
 * 1. Moderator joins and authenticates
 * 2. Admin joins and authenticates
 * 3. Admin creates a discussion board category
 * 4. Member joins and authenticates
 * 5. Member creates a post in the category
 * 6. Moderator logs in to authenticate
 * 7. Moderator updates the post's title and body respecting constraints
 * 8. Validate that the updated post matches the input
 */
export async function test_api_discussion_board_post_update_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator signs up and authenticates
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join.joinModerator(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "StrongPass123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // 2. Admin signs up and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongPass123",
      displayName: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);

  // 3. Admin creates a discussion board category
  const categoryName = RandomGenerator.pick(["Economic", "Political"] as const);
  const categoryDescription = `Category for ${categoryName.toLowerCase()} discussions`;
  const category =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Member signs up and authenticates
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "StrongPass123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 5. Member creates a discussion board post
  const postTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 7,
  });
  const postStatus = "public";
  const post =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: postTitle,
          body: postBody,
          post_status: postStatus,
        } satisfies IDiscussionBoardDiscussionBoardPost.ICreate,
      },
    );
  typia.assert(post);

  // 6. Moderator logs in to authenticate
  await api.functional.auth.moderator.login.loginModerator(connection, {
    body: {
      email: moderatorEmail,
      password: "StrongPass123",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 7. Moderator updates the post
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 6,
    wordMax: 10,
  });
  const updatedBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 12,
    sentenceMax: 18,
    wordMin: 5,
    wordMax: 9,
  });
  const updateBody = {
    title: updatedTitle.substring(0, 100), // Ensure max length 100
    body: updatedBody.substring(0, 5000), // Ensure max length 5000
  } satisfies IDiscussionBoardDiscussionBoardPost.IUpdate;
  const updatedPost =
    await api.functional.discussionBoard.moderator.discussionBoardPosts.update(
      connection,
      {
        discussionBoardPostId: post.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPost);

  // 8. Validate updated post matches input
  TestValidator.equals("updated post id matches", updatedPost.id, post.id);
  TestValidator.equals(
    "updated post title matches",
    updatedPost.title,
    updateBody.title,
  );
  TestValidator.equals(
    "updated post body matches",
    updatedPost.body,
    updateBody.body,
  );
}
