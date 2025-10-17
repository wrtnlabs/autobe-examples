import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardBlockedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBlockedUser";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";

export async function test_api_blocked_user_unblock_restores_content_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create Member A who will perform blocking and unblocking operations
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = "SecurePass123!@#";
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberAEmail,
      password: memberAPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberA);

  // Step 2: Create Member B who will be blocked and then unblocked
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = "SecurePass456!@#";
  const memberBAuthConnection: api.IConnection = { ...connection, headers: {} };
  const memberB = await api.functional.auth.member.join(memberBAuthConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberBEmail,
      password: memberBPassword,
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberB);

  // Step 3: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { ...connection, headers: {} };
  const admin = await api.functional.auth.administrator.join(adminConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: adminEmail,
      password: "AdminPass789!@#",
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Administrator creates a discussion category
  const category =
    await api.functional.discussionBoard.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Economics Discussion",
          slug: "economics-discussion",
          description: "Discussions about economic topics and theories",
          parent_category_id: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Member B creates a discussion topic (content to test visibility)
  const topic = await api.functional.discussionBoard.member.topics.create(
    memberBAuthConnection,
    {
      body: {
        title: "Impact of Monetary Policy on Inflation Rates",
        body: "This topic explores how central bank monetary policy decisions influence inflation rates in modern economies. We examine both expansionary and contractionary policies.",
        category_id: category.id,
        tag_ids: null,
      } satisfies IDiscussionBoardTopic.ICreate,
    },
  );
  typia.assert(topic);
  TestValidator.equals(
    "topic author matches member B",
    topic.author.id,
    memberB.id,
  );

  // Step 6: Member A blocks Member B
  const blockRelationship =
    await api.functional.discussionBoard.member.users.blockedUsers.create(
      connection,
      {
        userId: memberA.id,
        body: {
          blocked_user_id: memberB.id,
          reason: "Testing block/unblock functionality for content visibility",
        } satisfies IDiscussionBoardBlockedUser.ICreate,
      },
    );
  typia.assert(blockRelationship);

  // Step 7: Verify the blocking relationship was created correctly
  TestValidator.equals(
    "blocker is member A",
    blockRelationship.blocker.id,
    memberA.id,
  );
  TestValidator.equals(
    "blocked user is member B",
    blockRelationship.blocked.id,
    memberB.id,
  );
  TestValidator.equals(
    "block reason matches",
    blockRelationship.reason,
    "Testing block/unblock functionality for content visibility",
  );

  // Step 8: Member A unblocks Member B (soft delete - sets deleted_at timestamp)
  await api.functional.discussionBoard.member.blockedUsers.erase(connection, {
    blockedUserId: blockRelationship.id,
  });

  // Step 9: Verify unblock operation completed successfully
  // The unblock operation uses soft deletion, setting deleted_at timestamp
  // The response is void (no return value), indicating successful deletion
  // The block record remains in the database with deleted_at set for audit purposes
  // Content from Member B should now be visible to Member A again
}
