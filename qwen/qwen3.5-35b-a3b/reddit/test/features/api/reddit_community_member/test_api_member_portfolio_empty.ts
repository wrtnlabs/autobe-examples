import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member portfolio retrieval for empty state (new member with no activity).
 *
 * Validates the edge case where a newly registered member has not created any posts or comments. The portfolio endpoint returns the member's profile information along with empty arrays for posts and comments, ensuring correct handling of members with zero activity.
 *
 * Special attention is given to verifying that karmaScore equals 0 and that both posts and comments arrays are empty arrays rather than null values, demonstrating proper initialization of the portfolio data structure for new members.
 *
 * 1. Create a new member account using authorize_member_join utility function.
 * 2. Retrieve the member's portfolio via public GET endpoint (no authentication required).
 * 3. Verify member profile fields match the created account (id, username, timestamps).
 * 4. Verify karmaScore equals exactly 0 (no votes on non-existent content).
 * 5. Verify posts array is empty [] (not null, but empty array).
 * 6. Verify comments array is empty [] (not null, but empty array).
 * 7. Ensure no errors are thrown during portfolio retrieval.
 */
export async function test_api_member_portfolio_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account with no posts or comments
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Retrieve the member's portfolio (public endpoint, no authentication required)
  const portfolio =
    await api.functional.redditCommunity.member.members.portfolio.at(
      connection,
      {
        memberId: member.id,
      },
    );
  typia.assert(portfolio);
  // 3. Verify member profile information matches the created account
  TestValidator.equals("member id matches", portfolio.id, member.id);
  TestValidator.equals("username matches", portfolio.username, member.username);
  // 4. Verify karmaScore equals exactly 0 (no votes on non-existent content)
  TestValidator.equals("karmaScore is 0", portfolio.karmaScore, 0);
  // 5. Verify posts array is empty (not null, but empty array)
  TestValidator.equals("posts array is empty", portfolio.posts.length, 0);
  TestValidator.equals(
    "posts is array, not null",
    Array.isArray(portfolio.posts),
    true,
  );
  // 6. Verify comments array is empty (not null, but empty array)
  TestValidator.equals("comments array is empty", portfolio.comments.length, 0);
  TestValidator.equals(
    "comments is array, not null",
    Array.isArray(portfolio.comments),
    true,
  );
}
