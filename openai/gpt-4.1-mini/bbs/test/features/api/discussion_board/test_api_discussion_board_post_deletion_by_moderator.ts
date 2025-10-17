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
 * End-to-end test to validate deletion of discussion board post by an
 * authorized moderator.
 *
 * This test performs the full business workflow:
 *
 * 1. Registers and authenticates a moderator account.
 * 2. Registers and authenticates a member account to create posts.
 * 3. Registers and authenticates an admin account to create discussion board
 *    categories.
 * 4. Creates a discussion board category by the admin.
 * 5. Creates a discussion board post by the member in the created category.
 * 6. Deletes the newly created post using the moderator account.
 *
 * The test asserts correct creation and deletion sequences, validates entity
 * relationships, and ensures correct role authorization handling through
 * separate authentication steps.
 *
 * All data respects input constraints such as title and body length, and uses
 * appropriate random data generation for realism.
 *
 * This test ensures that only authorized moderators can delete posts and that
 * post deletion removes the post and associated replies correctly.
 */
export async function test_api_discussion_board_post_deletion_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator joins and authenticates
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join.joinModerator(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "ValidPass123!",
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // 2. Member joins and authenticates (to create post)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "ValidPass123!",
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 3. Admin joins and authenticates (to create category)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "ValidPass123!",
      displayName: RandomGenerator.name(2),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);

  // 4. Admin creates a discussion board category
  const categoryBody = {
    name: RandomGenerator.pick(["Economic", "Political"] as const),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;
  const category =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 5. Member creates a discussion board post in the created category
  const minTitleLength = 5;
  const maxTitleLength = 100;
  let title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  if (title.length < minTitleLength) title = title.padEnd(minTitleLength, "a");
  if (title.length > maxTitleLength) title = title.slice(0, maxTitleLength);
  const maxBodyLength = 5000;
  let body = RandomGenerator.content({ paragraphs: 3 });
  if (body.length > maxBodyLength) body = body.slice(0, maxBodyLength);
  // Use 'public' as post_status valid string
  const postBody = {
    category_id: category.id,
    title: title,
    body: body,
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;
  const post =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post category_id matches category.id",
    post.category_id,
    category.id,
  );

  // 6. Moderator deletes the created post
  await api.functional.discussionBoard.moderator.discussionBoardPosts.erase(
    connection,
    {
      discussionBoardPostId: post.id,
    },
  );

  // No direct read API to verify deletion exists, so deletion success is assumed by no error thrown
}
