import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPostKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostKarma";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_post_karma_mixed_votes_result_in_correct_net(
  connection: api.IConnection,
) {
  // Create a new member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Retrieve the member's aggregated post karma
  const karmaResult: ICommunityPlatformPostKarma =
    await api.functional.communityPlatform.member.karma.post.at(connection);
  typia.assert(karmaResult);

  // A new member should have zero karma from posts (no posts exist yet)
  // The karma system aggregates net upvotes minus downvotes from all posts
  // For a new member with no posts, the aggregated value must be 0
  TestValidator.equals("New member's post karma should be 0", karmaResult, "0");
}
