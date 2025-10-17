import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test updating a discussion board post by its owner member.
 *
 * This function will perform the following steps:
 *
 * 1. Create a new member user account via the join API.
 * 2. Authenticate as that member user to obtain tokens.
 * 3. Create a new discussion board category for the post, with a meaningful name
 *    such as 'Economic' or 'Political'.
 * 4. Create a new discussion board post with a valid title and body content within
 *    allowed length, and a valid post_status.
 * 5. Update the created discussion board post's title, body, and post_status.
 * 6. Verify the updated post returns correct updated fields and timestamps.
 * 7. Attempt to update the post with a different member user and expect an
 *    authorization error.
 *
 * The test uses proper type assertions and random but valid data per field
 * constraints.
 */
export async function test_api_discussion_board_post_update_by_owner_member(
  connection: api.IConnection,
) {
  // 1. Create a new member user account via join
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const memberJoin1 = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail1,
      password: "Password123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberJoin1);

  // 2. Create a second member user for negative authorization test
  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const memberJoin2 = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail2,
      password: "Password123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberJoin2);

  // 3. Create a discussion board category (using admin account - must join and login)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // Admin login to authenticate for category creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // Create category
  const categoryName = RandomGenerator.pick(["Economic", "Political"] as const);
  const categoryDescription = `Category for ${categoryName} discussions`;
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

  // 4. Switch authentication back to member 1
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail1,
      password: "Password123",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Create a discussion board post with valid data
  const createTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const createBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const createPostStatus = "public";
  const postCreateBody = {
    category_id: category.id,
    title: createTitle.slice(0, 90), // ensure less than 100 chars
    body: createBody.slice(0, 4900), // ensure less than 5000 chars
    post_status: createPostStatus,
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;

  const postCreated =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(postCreated);

  TestValidator.equals(
    "post category_id matches",
    postCreated.category_id,
    category.id,
  );
  TestValidator.equals(
    "post title matches",
    postCreated.title,
    postCreateBody.title,
  );
  TestValidator.equals(
    "post body matches",
    postCreated.body,
    postCreateBody.body,
  );
  TestValidator.equals(
    "post_status matches",
    postCreated.post_status,
    createPostStatus,
  );

  // 5. Update the post with new data
  const updateTitle = RandomGenerator.paragraph({
    sentences: 7,
    wordMin: 5,
    wordMax: 8,
  }).slice(0, 95);
  const updateBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 5,
    wordMax: 9,
  }).slice(0, 4995);
  const updatePostStatus = "pending";
  const postUpdateBody = {
    title: updateTitle,
    body: updateBody,
    post_status: updatePostStatus,
  } satisfies IDiscussionBoardDiscussionBoardPost.IUpdate;

  const postUpdated =
    await api.functional.discussionBoard.member.discussionBoardPosts.update(
      connection,
      {
        discussionBoardPostId: postCreated.id,
        body: postUpdateBody,
      },
    );
  typia.assert(postUpdated);

  TestValidator.equals(
    "updated category_id remains",
    postUpdated.category_id,
    category.id,
  );
  TestValidator.equals(
    "updated title matches",
    postUpdated.title,
    postUpdateBody.title,
  );
  TestValidator.equals(
    "updated body matches",
    postUpdated.body,
    postUpdateBody.body,
  );
  TestValidator.equals(
    "updated post_status matches",
    postUpdated.post_status,
    updatePostStatus,
  );

  TestValidator.predicate(
    "updated_at later than created_at",
    new Date(postUpdated.updated_at) > new Date(postUpdated.created_at),
  );

  // 6. Attempt to update the post with member 2 - expect authorization error
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail2,
      password: "Password123",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  await TestValidator.error(
    "member 2 cannot update another member's post",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardPosts.update(
        connection,
        {
          discussionBoardPostId: postCreated.id,
          body: {
            title: "Unauthorized update attempt",
          } satisfies IDiscussionBoardDiscussionBoardPost.IUpdate,
        },
      );
    },
  );
}
