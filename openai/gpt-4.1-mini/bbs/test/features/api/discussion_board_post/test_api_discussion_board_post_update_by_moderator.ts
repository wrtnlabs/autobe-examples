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

export async function test_api_discussion_board_post_update_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a new moderator user
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: {
        email: moderatorEmail,
        password: "Password123!",
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a discussion board category by admin user
  // To create a category, first register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        displayName: RandomGenerator.name(2),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // (Optional) Switch to admin login explicitly for clarity
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  const categoryName = RandomGenerator.name(1);
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 7,
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

  // 3. Register a new member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPass123!",
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 4. Member creates a post
  // Switch to member login explicitly
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPass123!",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const initialPostTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const initialPostBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });
  const initialPostStatus = "public";

  const createdPost: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: initialPostTitle.slice(0, 100),
          body: initialPostBody.slice(0, 5000),
          post_status: initialPostStatus,
        } satisfies IDiscussionBoardDiscussionBoardPost.ICreate,
      },
    );
  typia.assert(createdPost);

  // 5. Moderator updates the post
  // Switch to moderator login explicitly
  await api.functional.auth.moderator.login.loginModerator(connection, {
    body: {
      email: moderatorEmail,
      password: "Password123!",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const updatedTitle = RandomGenerator.paragraph({
    sentences: 7,
    wordMin: 5,
    wordMax: 10,
  }).slice(0, 100);
  const updatedBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 9,
  }).slice(0, 5000);
  const updatedStatus = "pending";

  const updatedPost: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.update(
      connection,
      {
        discussionBoardPostId: createdPost.id,
        body: {
          title: updatedTitle,
          body: updatedBody,
          post_status: updatedStatus,
        } satisfies IDiscussionBoardDiscussionBoardPost.IUpdate,
      },
    );
  typia.assert(updatedPost);

  // 6. Validate the updated post
  TestValidator.equals(
    "Updated post id should match",
    updatedPost.id,
    createdPost.id,
  );
  TestValidator.equals(
    "Updated post title should match",
    updatedPost.title,
    updatedTitle,
  );
  TestValidator.equals(
    "Updated post body should match",
    updatedPost.body,
    updatedBody,
  );
  TestValidator.equals(
    "Updated post status should match",
    updatedPost.post_status,
    updatedStatus,
  );

  // Validate timestamps
  TestValidator.predicate(
    "Updated post updated_at should be later or equal to created_at",
    new Date(updatedPost.updated_at).getTime() >=
      new Date(updatedPost.created_at).getTime(),
  );

  // Validate category_id and member_id remain correct or updated if provided
  TestValidator.equals(
    "Updated category id matches",
    updatedPost.category_id,
    createdPost.category_id,
  );
  TestValidator.equals(
    "Updated member id matches",
    updatedPost.member_id,
    createdPost.member_id,
  );
}
