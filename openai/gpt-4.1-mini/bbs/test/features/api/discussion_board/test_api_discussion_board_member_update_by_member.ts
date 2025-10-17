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
 * This test validates the update operation of discussion board member profiles
 * by themselves.
 *
 * It includes the following business workflows:
 *
 * 1. Create a new admin account and authenticate.
 * 2. Create discussion board categories with admin to satisfy prerequisites.
 * 3. Create a new member account and authenticate as member.
 * 4. Create a discussion board post by the member.
 * 5. Update the member's profile (email, password, display name).
 * 6. Verify the member's profile is updated.
 * 7. Attempt unauthorized update as a different member and verify failure.
 *
 * All steps use proper DTOs with satisfies keyword and assert return types with
 * typia. TestValidator functions perform all necessary verification with
 * descriptive titles. Authentication is switched properly between admin and
 * member roles.
 */
export async function test_api_discussion_board_member_update_by_member(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123";
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        displayName: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin creates discussion board categories
  const category1Name = "Economic";
  const category1Description = "Discussion on economic topics.";
  const category1: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: category1Name,
          description: category1Description,
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category1);

  const category2Name = "Political";
  const category2Description = "Discussion on political topics.";
  const category2: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: category2Name,
          description: category2Description,
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category2);

  // 3. Member joins and authenticates
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 4. Member creates a discussion board post
  const postTitle = "Exploring Economical Policies";
  const postBody = RandomGenerator.paragraph({
    sentences: 7,
    wordMin: 5,
    wordMax: 10,
  });
  const postStatus = "public";
  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: {
          category_id: category1.id,
          title: postTitle,
          body: postBody,
          post_status: postStatus,
        } satisfies IDiscussionBoardDiscussionBoardPost.ICreate,
      },
    );
  typia.assert(post);

  // 5. Member updates their profile
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedPassword = "NewMemberPass456";
  const updatedDisplayName = RandomGenerator.name();

  const updatedMember: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.discussionBoardMembers.update(
      connection,
      {
        discussionBoardMemberId: member.id,
        body: {
          email: updatedEmail,
          password: updatedPassword,
          display_name: updatedDisplayName,
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updatedMember);

  TestValidator.equals("email updated", updatedMember.email, updatedEmail);
  TestValidator.equals(
    "display name updated",
    updatedMember.display_name,
    updatedDisplayName,
  );

  // 6. Login with old password should fail
  await TestValidator.error("login fails with old password", async () => {
    await api.functional.auth.member.login(connection, {
      body: {
        email: updatedEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ILogin,
    });
  });

  // 7. Login with updated password should succeed
  const loggedInMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: updatedEmail,
        password: updatedPassword,
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(loggedInMember);
  TestValidator.equals(
    "login member id matches",
    loggedInMember.id,
    updatedMember.id,
  );

  // 8. Unauthorized update attempt by a different member
  const otherMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const otherMemberPassword = "OtherPass789";
  const otherMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: otherMemberEmail,
        password: otherMemberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(otherMember);

  await TestValidator.error(
    "unauthorized member cannot update another member",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardMembers.update(
        connection,
        {
          discussionBoardMemberId: updatedMember.id,
          body: {
            email: memberEmail, // attempting revert to old email
          } satisfies IDiscussionBoardMember.IUpdate,
        },
      );
    },
  );
}
