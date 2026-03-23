import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
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
 * Test viewing a user's post history when they have no posts (empty result scenario).
 *
 * This test validates that the API correctly handles the edge case where a
 * registered user has not yet created any content. The API should return
 * a valid response with an empty data array and accurate pagination metadata,
 * rather than throwing an error or returning a 404.
 */
export async function test_api_user_post_history_view_empty_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a member account with no posts
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Test: View the user's post history (should be empty)
  const posts = await api.functional.redditClone.users.posts.list(
    memberConnection,
    {
      username: member.username,
    },
  );
  typia.assert(posts);
  // 3. Validate: Response structure is correct
  TestValidator.equals("data array exists", posts.data.length, 0);
  TestValidator.equals("records count is zero", posts.pagination.records, 0);
  TestValidator.equals("pages count is zero", posts.pagination.pages, 0);
  TestValidator.equals("current page is 1", posts.pagination.current, 1);
  TestValidator.predicate("limit is positive", posts.pagination.limit > 0);
}
