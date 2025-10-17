import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

// Implementation is a comprehensive E2E test function for
// updating a discussion board post by a member user.
// The test flows through user registrations and logins,
// category creation by an admin, post creation by a member,
// and member-based post update with proper content constraints.
// Validations including type assertions and TestValidator checks
// are performed at each step for correctness.

export async function test_api_discussion_board_post_update_by_member(
  connection: api.IConnection,
) {
  // 1. Member user registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssw0rd123";
  const memberDisplayName = RandomGenerator.name();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: memberDisplayName,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Member login to ensure session authorization
  const memberLogin: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(memberLogin);

  // 3. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminP@ss123";
  const adminDisplayName = RandomGenerator.name();
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        displayName: adminDisplayName,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 4. Admin login to authorize category creation
  const adminLogin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 5. Admin creates a new discussion board category
  const categoryNameOptions = ["Economics", "Politics"] as const;
  const categoryName = RandomGenerator.pick(categoryNameOptions);
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const category: IDiscussionBoardDiscussionBoardCategory =
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

  // 6. Switch back to member authentication (login)
  const memberRelogin: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(memberRelogin);

  // 7. Member creates a new post in the created category
  const postTitle = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 5,
    wordMax: 10,
  });
  const postStatus = "public";
  const postCreatePayload = {
    category_id: category.id,
    title:
      postTitle.length >= 5 && postTitle.length <= 100
        ? postTitle
        : postTitle.padEnd(5, "a"),
    body: postBody.length <= 5000 ? postBody : postBody.slice(0, 5000),
    post_status: postStatus,
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;

  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: postCreatePayload,
      },
    );
  typia.assert(post);

  // 8. Member updates their own post - valid update with new title and body
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 5,
    wordMax: 8,
  });
  const updatedBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 5,
    wordMax: 8,
  });

  // Ensure updated title length between 5 and 100
  const safeUpdatedTitle =
    updatedTitle.length >= 5 && updatedTitle.length <= 100
      ? updatedTitle
      : updatedTitle.padEnd(5, "b");

  // Ensure updated body length <= 5000 chars
  const safeUpdatedBody =
    updatedBody.length <= 5000 ? updatedBody : updatedBody.slice(0, 5000);

  const postUpdatePayload = {
    title: safeUpdatedTitle,
    body: safeUpdatedBody,
  } satisfies IDiscussionBoardDiscussionBoardPost.IUpdate;

  const updatedPost: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.update(
      connection,
      {
        discussionBoardPostId: post.id,
        body: postUpdatePayload,
      },
    );
  typia.assert(updatedPost);

  TestValidator.equals(
    "post id unchanged after update",
    updatedPost.id,
    post.id,
  );
  TestValidator.equals(
    "post title updated correctly",
    updatedPost.title,
    safeUpdatedTitle,
  );
  TestValidator.equals(
    "post body updated correctly",
    updatedPost.body,
    safeUpdatedBody,
  );
}
