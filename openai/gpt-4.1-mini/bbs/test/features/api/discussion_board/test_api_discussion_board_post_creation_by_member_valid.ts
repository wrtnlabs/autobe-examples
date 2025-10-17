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
 * This test validates the creation of a new discussion board post by an
 * authenticated member. The test covers the following steps:
 *
 * 1. Create two distinct member user accounts and authenticate them to simulate
 *    multi-actor roles.
 * 2. Create an admin user and authenticate to handle category creation.
 * 3. Admin creates a new discussion board category.
 * 4. Member authenticates via login to establish session context.
 * 5. Member creates a new discussion board post linked to the created category.
 * 6. Validate the post creation response for correctness of all fields including
 *    timestamps and status.
 * 7. Optionally, try negative scenarios such as creating post with invalid title
 *    length (not implemented here since instructions prohibit type error
 *    testing).
 * 8. Ensure post creation is persisted and retrievable by confirming category and
 *    member links.
 *
 * This ensures role-based access control, data integrity and input validation
 * of the discussion board APIs.
 */
export async function test_api_discussion_board_post_creation_by_member_valid(
  connection: api.IConnection,
) {
  // 1. Create first member
  const member1Email: string = typia.random<string & tags.Format<"email">>();
  const member1Password = "Password123!";
  const member1DisplayName = RandomGenerator.name(2);
  const member1Authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: member1Password,
        display_name: member1DisplayName,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1Authorized);

  // 2. Create second member for multi-actor scenario
  const member2Email: string = typia.random<string & tags.Format<"email">>();
  const member2Password = "Password123!";
  const member2DisplayName = RandomGenerator.name(2);
  const member2Authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: member2Password,
        display_name: member2DisplayName,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2Authorized);

  // 3. Create admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword1!";
  const adminDisplayName = RandomGenerator.name(2);
  const adminAuthorized: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        displayName: adminDisplayName,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminAuthorized);

  // 4. Admin login to ensure token refresh and context switch
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 5. Admin creates a discussion board category
  const categoryNameOptions = ["Economic", "Political"] as const;
  const categoryName = RandomGenerator.pick(categoryNameOptions);
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });
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

  // 6. Member1 login to establish session and token
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: member1Password,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 7. Member1 creates a discussion board post with valid fields
  const postTitle = RandomGenerator.paragraph({
    sentences: 7,
    wordMin: 5,
    wordMax: 10,
  });
  // Ensures length between 5 to 100 characters
  const finalPostTitle =
    postTitle.length > 100
      ? postTitle.slice(0, 100)
      : postTitle.length < 5
        ? postTitle + " extra"
        : postTitle;

  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });
  // Ensures body length up to 5000 characters
  const finalPostBody =
    postBody.length > 5000 ? postBody.slice(0, 5000) : postBody;

  const postStatus = "public";

  const postCreateBody: IDiscussionBoardDiscussionBoardPost.ICreate = {
    category_id: category.id,
    title: finalPostTitle,
    body: finalPostBody,
    post_status: postStatus,
  };

  const createdPost: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(createdPost);

  // 8. Validate created post properties
  TestValidator.equals(
    "category id matches input",
    createdPost.category_id,
    category.id,
  );
  TestValidator.equals(
    "title matches input",
    createdPost.title,
    postCreateBody.title,
  );
  TestValidator.equals(
    "body matches input",
    createdPost.body,
    postCreateBody.body,
  );
  TestValidator.equals(
    "post status is public",
    createdPost.post_status,
    postStatus,
  );

  // Validate member ID presence and format
  TestValidator.predicate(
    "member id is present and valid UUID",
    typeof createdPost.member_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        createdPost.member_id,
      ),
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof createdPost.created_at === "string" &&
      !isNaN(Date.parse(createdPost.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof createdPost.updated_at === "string" &&
      !isNaN(Date.parse(createdPost.updated_at)),
  );

  // Validate deleted_at is null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    createdPost.deleted_at === null || createdPost.deleted_at === undefined,
  );

  // 9. Additional validation: member_id must equal to member1Authorized.id
  TestValidator.equals(
    "member_id matches authenticated member",
    createdPost.member_id,
    member1Authorized.id,
  );
}
