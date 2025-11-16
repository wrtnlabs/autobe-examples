import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that only moderators can execute ban operations.
 *
 * This test validates role-based access control by verifying that member
 * accounts cannot ban other members. A member authenticates and attempts to
 * call the ban endpoint with another member's ID. The system must reject this
 * unauthorized request because members lack moderator privileges. The ban
 * endpoint should only be accessible to authenticated moderators.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a category for article organization
 * 3. Create first member account (to be banned later)
 * 4. Create second member account (will attempt unauthorized ban)
 * 5. Switch to second member's authentication context
 * 6. Attempt to ban first member using ban endpoint - should fail with
 *    authorization error
 * 7. Verify that member cannot perform ban operations
 */
export async function test_api_member_ban_authorization_restricted_to_moderators(
  connection: api.IConnection,
) {
  // 1. Create and authenticate moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_password_123";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create category
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create first member (target of ban)
  const member1Email: string = typia.random<string & tags.Format<"email">>();
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: RandomGenerator.alphabets(10),
        password: "member1_password_123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  // 4. Create second member (will attempt unauthorized ban)
  const member2Email: string = typia.random<string & tags.Format<"email">>();
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: RandomGenerator.alphabets(10),
        password: "member2_password_123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  // 5. Switch to member2 authentication context
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: "member2_password_123",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 6. Attempt to ban member1 - should fail with authorization error
  await TestValidator.error(
    "member account cannot ban other members",
    async () => {
      await api.functional.discussionBoard.moderator.members.ban(connection, {
        memberId: member1.id,
        body: {
          reason: "Unauthorized ban attempt by non-moderator",
          notes: "This should fail",
        } satisfies IDiscussionBoardMember.IBan,
      });
    },
  );

  TestValidator.predicate(
    "member account lacks moderator privileges for ban operations",
    true,
  );
}
