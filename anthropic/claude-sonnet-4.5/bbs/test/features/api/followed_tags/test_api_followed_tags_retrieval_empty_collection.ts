import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFollowedTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFollowedTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardFollowedTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFollowedTag";

/**
 * Test retrieving followed tags for a member who hasn't followed any tags yet.
 *
 * This test validates that the system correctly handles empty followed tags
 * collections for newly registered members. When a member has not followed any
 * tags, the API should return a properly structured empty paginated response
 * with correct metadata indicating zero total items.
 *
 * Workflow:
 *
 * 1. Register a new member account and authenticate
 * 2. Immediately retrieve the member's followed tags list without following any
 *    tags
 * 3. Validate that the response contains an empty data array with proper
 *    pagination metadata
 * 4. Verify that pagination.records is 0, pagination.pages is 0, and data array is
 *    empty
 */
export async function test_api_followed_tags_retrieval_empty_collection(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberRegistration = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });

  typia.assert(authorizedMember);

  // Step 2: Retrieve the followed tags list for the newly created member
  const followedTagsRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardFollowedTag.IRequest;

  const followedTagsResult: IPageIDiscussionBoardFollowedTag.ISummary =
    await api.functional.discussionBoard.member.users.followedTags.index(
      connection,
      {
        userId: authorizedMember.id,
        body: followedTagsRequest,
      },
    );

  typia.assert(followedTagsResult);

  // Step 3: Validate empty collection response
  TestValidator.equals(
    "data array should be empty",
    followedTagsResult.data,
    [],
  );

  TestValidator.equals(
    "total records should be zero",
    followedTagsResult.pagination.records,
    0,
  );

  TestValidator.equals(
    "total pages should be zero",
    followedTagsResult.pagination.pages,
    0,
  );

  TestValidator.equals(
    "current page should match requested page",
    followedTagsResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match requested limit",
    followedTagsResult.pagination.limit,
    20,
  );
}
