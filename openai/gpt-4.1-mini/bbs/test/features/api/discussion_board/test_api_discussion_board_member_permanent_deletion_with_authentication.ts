import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_member_permanent_deletion_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register new member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberCreateBody = {
    email: memberEmail,
    password: "ValidPass123",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;
  const memberAuthorized = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(memberAuthorized);

  // 2. Authenticate member user (redundant but simulate role switching later)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "ValidPass123",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 3. Register and login admin user for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password: "AdminPass123",
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(adminAuthorized);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 4. Create discussion board category
  const categoryBody = {
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 5. Switch back to member user auth context
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "ValidPass123",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 6. Create discussion board post associated with category and member
  const postBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;

  const post =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // 7. Permanently delete the discussion board member using their ID
  await api.functional.discussionBoard.member.discussionBoardMembers.erase(
    connection,
    { discussionBoardMemberId: memberAuthorized.id },
  );

  // 8. Verify member deletion by attempting to authenticate again - expect error
  await TestValidator.error(
    "deleted member cannot authenticate again",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: "ValidPass123",
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}
