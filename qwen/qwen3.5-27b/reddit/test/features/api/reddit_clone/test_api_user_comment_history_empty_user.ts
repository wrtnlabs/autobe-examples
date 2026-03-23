import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving comment history for a user who exists but has no comments.
 *
 * Setup: Create a new member user account without creating any comments.
 *
 * Test Steps:
 * 1. Create a new member connection and register a user via authorize_member_join
 * 2. Call PATCH /redditClone/users/{username}/comments with the created user's username
 * 3. Verify response returns empty data array
 * 4. Verify pagination metadata shows: current=1, records=0, pages=0
 * 5. Verify response structure is valid even with empty results
 */
export async function test_api_user_comment_history_empty_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register user without comments
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Retrieve comment history for the user with no comments
  const comments = await api.functional.redditClone.users.comments.index(
    memberConnection,
    {
      username: member.username,
      body: {} satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(comments);
  // 3. Validate empty response structure
  TestValidator.equals("data array is empty", comments.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    comments.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", comments.pagination.pages, 0);
  TestValidator.equals(
    "pagination current is 1",
    comments.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default 20",
    comments.pagination.limit,
    20,
  );
}
