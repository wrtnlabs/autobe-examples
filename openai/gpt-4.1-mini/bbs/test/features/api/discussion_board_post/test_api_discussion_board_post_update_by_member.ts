import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_post_update_by_member(
  connection: api.IConnection,
) {
  // 1. Create admin user and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin#1234";

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        displayName: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 2. Create member #1 and member #2 and login as member #1
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const memberPassword1 = "Member#1234";
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail1,
        password: memberPassword1,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const memberPassword2 = "Member#5678";
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail2,
        password: memberPassword2,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail1,
      password: memberPassword1,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 3. Admin creates a discussion board category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  const categoryName = ["Economic", "Political"] as const;
  const categoryDescription =
    "Category for discussion topics about " +
    RandomGenerator.pick(categoryName);

  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.pick(categoryName),
          description: categoryDescription,
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Switch to member #1 authentication and create a post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail1,
      password: memberPassword1,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const initialPostTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 15,
  });
  const initialPostBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 5,
    wordMax: 15,
  });

  const postCreateBody = {
    category_id: category.id,
    title: initialPostTitle,
    body: initialPostBody,
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;

  const createdPost: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(createdPost);
  TestValidator.equals(
    "created post category_id",
    createdPost.category_id,
    category.id,
  );
  TestValidator.equals(
    "created post title",
    createdPost.title,
    initialPostTitle,
  );

  // 5. Member #1 updates their post

  // Prepare update with changed title and body
  const updatedTitle1 = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 10,
    wordMax: 20,
  });
  const updatedBody1 = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 8,
    wordMax: 16,
  });

  const updateBody1 = {
    title: updatedTitle1,
    body: updatedBody1,
  } satisfies IDiscussionBoardDiscussionBoardPost.IUpdate;

  const updatedPost1: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.update(
      connection,
      { discussionBoardPostId: createdPost.id, body: updateBody1 },
    );
  typia.assert(updatedPost1);
  TestValidator.equals(
    "updated post title #1",
    updatedPost1.title,
    updatedTitle1,
  );
  TestValidator.equals("updated post body #1", updatedPost1.body, updatedBody1);

  // 6. Update title only
  const updatedTitle2 = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 7,
    wordMax: 14,
  });
  const updateBody2 = {
    title: updatedTitle2,
  } satisfies IDiscussionBoardDiscussionBoardPost.IUpdate;

  const updatedPost2: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.update(
      connection,
      { discussionBoardPostId: createdPost.id, body: updateBody2 },
    );
  typia.assert(updatedPost2);
  TestValidator.equals(
    "updated post title #2",
    updatedPost2.title,
    updatedTitle2,
  );

  // 7. Update category_id only
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  const otherCategory: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.pick(categoryName),
          description: "Other category for testing",
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(otherCategory);

  // Switch back to member #1
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail1,
      password: memberPassword1,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const updateBody3 = {
    category_id: otherCategory.id,
  } satisfies IDiscussionBoardDiscussionBoardPost.IUpdate;

  const updatedPost3: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.update(
      connection,
      { discussionBoardPostId: createdPost.id, body: updateBody3 },
    );
  typia.assert(updatedPost3);
  TestValidator.equals(
    "updated post category_id #3",
    updatedPost3.category_id,
    otherCategory.id,
  );

  // 8. Negative test: member #2 tries to update member #1's post, expect error
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail2,
      password: memberPassword2,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  await TestValidator.error(
    "member #2 cannot update member #1 post",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardPosts.update(
        connection,
        { discussionBoardPostId: createdPost.id, body: updateBody1 },
      );
    },
  );

  // 9. Negative test: update non-existent post
  await TestValidator.error("updating non-existent post fails", async () => {
    await api.functional.discussionBoard.member.discussionBoardPosts.update(
      connection,
      {
        discussionBoardPostId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody1,
      },
    );
  });
}
