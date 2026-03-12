import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMember";
import type { IRedditCloneBlock } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBlock";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_blocks_create } from "../../../generate/generate_random_reddit_clone_member_blocks_create";
import { prepare_random_reddit_clone_block } from "../../../prepare/prepare_random_reddit_clone_block";

/**
 * Test that blocked users still appear in search results.
 *
 * This test verifies that the user search functionality returns all users
 * regardless of block relationships, as specified in section 320 requirements.
 * Blocked users should still be discoverable through search to maintain
 * search functionality independent of user block status.
 */
export async function test_api_user_search_blocked_users_included(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create userA (blocker)
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_member_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(userA);
  // 2. Create userB (to be blocked)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_member_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(userB);
  // 3. Use userA's authenticated connection to block userB
  const block = await api.functional.redditClone.member.blocks.create(
    userAConnection,
    {
      body: {
        blocked_user_id: userB.id,
      } satisfies IRedditCloneBlock.ICreate,
    },
  );
  typia.assert(block);
  // 4. Search for userB using their username (search doesn't require auth)
  const searchConnection: api.IConnection = { host: connection.host };
  const searchResults = await api.functional.redditClone.users.search(
    searchConnection,
    {
      body: {
        search: userB.username,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(searchResults);
  // 5. Verify userB appears in search results despite being blocked
  const foundUser = searchResults.data.find((user) => user.id === userB.id);
  TestValidator.predicate(
    "blocked user appears in search results",
    foundUser !== undefined,
  );
  // 6. Verify all expected user summary fields are present
  if (foundUser) {
    TestValidator.equals("user ID matches", foundUser.id, userB.id);
    TestValidator.equals(
      "username matches",
      foundUser.username,
      userB.username,
    );
    TestValidator.equals(
      "display name matches",
      foundUser.display_name,
      userB.display_name,
    );
    TestValidator.predicate(
      "has valid karma score",
      typeof foundUser.karma === "number",
    );
  }
  // 7. Verify search returned at least one result
  TestValidator.predicate(
    "search results contain at least one user",
    searchResults.data.length >= 1,
  );
}
