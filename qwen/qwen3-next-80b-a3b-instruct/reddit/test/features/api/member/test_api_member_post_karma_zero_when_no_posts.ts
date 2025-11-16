import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPostKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostKarma";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_post_karma_zero_when_no_posts(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with no posts
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    href: "https://community-platform.com/join",
    referrer: "https://community-platform.com/home",
    ip: "192.168.1.100",
  } satisfies IMember.ICreate;

  const authenticatedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Verify that the karma score for posts is zero when no posts exist
  const postKarma: ICommunityPlatformPostKarma =
    await api.functional.communityPlatform.member.karma.post.at(connection);
  typia.assert(postKarma);

  // Step 3: Validate that the karma score is "0" (as per ICommunityPlatformPostKarma being string type)
  TestValidator.equals(
    "post karma score should be zero for member with no posts",
    postKarma,
    "0",
  );
}
