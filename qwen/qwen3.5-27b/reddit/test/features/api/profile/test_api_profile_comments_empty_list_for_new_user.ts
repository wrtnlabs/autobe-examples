import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test viewing comments for a user who has never written any comments.
 *
 * Validates that the comment listing endpoint correctly handles empty comment lists for new users who have not yet posted any comments. Ensures that the API returns a valid paginated response with zero records and appropriate pagination metadata, rather than throwing an error or returning an invalid structure.
 *
 * Special attention is given to verifying that the pagination metadata correctly reflects zero total records and zero pages, while maintaining the same response structure as non-empty results. This test confirms that the system gracefully handles the edge case of users with no comment history.
 *
 * 1. Create a new member account using authorize_member_join utility function.
 * 2. Do NOT create any comments for this user (they remain comment-free).
 * 3. Call PATCH /redditClone/profiles/{profileId}/comments with the new user's profileId.
 * 4. Verify response returns empty data array.
 * 5. Verify pagination metadata shows: current=1, limit=default, records=0, pages=0.
 * 6. Verify no error is returned - empty list is valid.
 * 7. Verify response structure is still valid IPageIRedditCloneComment.ISummary.
 */
export async function test_api_profile_comments_empty_list_for_new_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account with no comments
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Get the user profile ID from the authorized member
  const profileId = member.id;
  // 3. Call the comments endpoint with the new user's profileId
  const commentsPage = await api.functional.redditClone.profiles.comments.index(
    memberConnection,
    {
      profileId: profileId,
      body: {} satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(commentsPage);
  // 4. Verify response returns empty data array
  TestValidator.equals("comments array is empty", commentsPage.data.length, 0);
  // 5. Verify pagination metadata shows correct values for empty list
  TestValidator.equals("current page is 1", commentsPage.pagination.current, 1);
  TestValidator.equals(
    "records count is 0",
    commentsPage.pagination.records,
    0,
  );
  TestValidator.equals("pages count is 0", commentsPage.pagination.pages, 0);
  // 6. Verify limit is set to a valid default value (should be > 0)
  TestValidator.predicate(
    "limit is a positive number",
    commentsPage.pagination.limit > 0,
  );
}
