import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneBan";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test that a community moderator can retrieve a paginated list of currently active banned users.
 *
 * This test verifies:
 * 1. Community creation with owner member
 * 2. Additional member account creation
 * 3. Ban list retrieval with active status filter
 * 4. Response structure validation including pagination metadata
 */
export async function test_api_community_ban_list_retrieve_active_bans(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create community with owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create additional member accounts (potential ban targets)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member2);
  // 4. Retrieve active ban list as community owner/moderator
  const banList = await api.functional.redditClone.communities.bans.index(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        status: "active",
        sortBy: "banned_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneBan.IRequest,
    },
  );
  typia.assert(banList);
  // 5. Validate response structure
  TestValidator.predicate(
    "pagination exists",
    banList.pagination !== undefined,
  );
  TestValidator.equals("current page", banList.pagination.current, 1);
  TestValidator.equals("limit", banList.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    banList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    banList.pagination.pages >= 0,
  );
  // 6. Validate data array structure (may be empty if no bans exist)
  TestValidator.predicate("data is array", Array.isArray(banList.data));
  // 7. If there are any bans, validate their structure
  if (banList.data.length > 0) {
    const firstBan = banList.data[0];
    TestValidator.predicate("ban has id", firstBan.id !== undefined);
    TestValidator.predicate(
      "ban has banned_at",
      firstBan.banned_at !== undefined,
    );
    TestValidator.equals(
      "active ban has null lifted_at",
      firstBan.lifted_at,
      null,
    );
    TestValidator.predicate(
      "ban has member info",
      firstBan.member !== undefined,
    );
    TestValidator.predicate(
      "member has username",
      firstBan.member.username !== undefined,
    );
  }
}
