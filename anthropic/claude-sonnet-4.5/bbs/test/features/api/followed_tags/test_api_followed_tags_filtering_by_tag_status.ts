import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardFollowedTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFollowedTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardFollowedTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFollowedTag";

/**
 * Test filtering followed tags by tag status with active tags.
 *
 * This test validates the status filtering functionality for followed tags.
 * Since administrator-created tags are automatically set to 'active' status,
 * this test focuses on verifying that active status filtering works correctly:
 *
 * 1. Creates member and administrator accounts for authentication contexts
 * 2. Administrator creates multiple tags (all will have 'active' status)
 * 3. Member follows all created tags to build a followed tags collection
 * 4. Tests filtering by 'active' status to verify all tags are returned
 * 5. Tests retrieval without status filter to verify all tags are returned
 * 6. Validates response data includes proper status information for each tag
 */
export async function test_api_followed_tags_filtering_by_tag_status(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for testing tag following
  const memberBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // Step 2: Create an administrator account for tag management
  const adminBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!@#",
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 3: Administrator creates multiple tags (all will be 'active' status)
  const tagCount = 3;
  const createdTags: IDiscussionBoardTag[] = [];

  for (let i = 0; i < tagCount; i++) {
    const tagBody = {
      name: `active-tag-${RandomGenerator.alphaNumeric(6)}`,
      description: `Tag ${i + 1} for testing active status filtering`,
    } satisfies IDiscussionBoardTag.ICreate;

    const tag: IDiscussionBoardTag =
      await api.functional.discussionBoard.administrator.tags.create(
        connection,
        {
          body: tagBody,
        },
      );
    typia.assert(tag);
    createdTags.push(tag);
  }

  // Verify all created tags have 'active' status
  for (const tag of createdTags) {
    TestValidator.equals(
      "administrator-created tag should have active status",
      tag.status,
      "active",
    );
  }

  // Switch back to member context for following tags
  await api.functional.auth.member.join(connection, {
    body: memberBody,
  });

  // Step 4: Member follows all created tags
  const followedTags: IDiscussionBoardFollowedTag[] = [];

  for (const tag of createdTags) {
    const followBody = {
      discussion_board_tag_id: tag.id,
    } satisfies IDiscussionBoardFollowedTag.ICreate;

    const followedTag: IDiscussionBoardFollowedTag =
      await api.functional.discussionBoard.member.users.followedTags.create(
        connection,
        {
          userId: member.id,
          body: followBody,
        },
      );
    typia.assert(followedTag);
    followedTags.push(followedTag);
  }

  // Step 5: Retrieve followed tags with status filter set to 'active'
  const activeFilterRequest = {
    tag_status: "active",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardFollowedTag.IRequest;

  const activeFilteredResult: IPageIDiscussionBoardFollowedTag.ISummary =
    await api.functional.discussionBoard.member.users.followedTags.index(
      connection,
      {
        userId: member.id,
        body: activeFilterRequest,
      },
    );
  typia.assert(activeFilteredResult);

  // Step 6: Validate that active tags are returned with correct status
  TestValidator.predicate(
    "filtered result should contain data",
    activeFilteredResult.data.length > 0,
  );

  TestValidator.equals(
    "filtered result should return all followed tags",
    activeFilteredResult.data.length,
    createdTags.length,
  );

  for (const followedTag of activeFilteredResult.data) {
    TestValidator.equals(
      "tag status should be active when filtered by active",
      followedTag.tag_status,
      "active",
    );
  }

  // Step 7: Retrieve followed tags without status filtering
  const allTagsRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardFollowedTag.IRequest;

  const allTagsResult: IPageIDiscussionBoardFollowedTag.ISummary =
    await api.functional.discussionBoard.member.users.followedTags.index(
      connection,
      {
        userId: member.id,
        body: allTagsRequest,
      },
    );
  typia.assert(allTagsResult);

  // Step 8: Verify unfiltered results match filtered results (all tags are active)
  TestValidator.predicate(
    "unfiltered result should contain data",
    allTagsResult.data.length > 0,
  );

  TestValidator.equals(
    "unfiltered result should contain all followed tags",
    allTagsResult.data.length,
    createdTags.length,
  );

  // Verify all tags in unfiltered result have status information
  for (const followedTag of allTagsResult.data) {
    TestValidator.predicate(
      "each followed tag should have a status field",
      followedTag.tag_status !== null && followedTag.tag_status !== undefined,
    );

    TestValidator.equals(
      "unfiltered tag status should be active",
      followedTag.tag_status,
      "active",
    );
  }

  // Verify both filtered and unfiltered results are equivalent for active tags
  TestValidator.equals(
    "filtered and unfiltered results should match when all tags are active",
    activeFilteredResult.data.length,
    allTagsResult.data.length,
  );
}
