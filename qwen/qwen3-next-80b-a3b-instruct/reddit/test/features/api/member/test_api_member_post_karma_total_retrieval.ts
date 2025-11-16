import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPostKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostKarma";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_post_karma_total_retrieval(
  connection: api.IConnection,
) {
  // Register a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";
  const memberHref = "https://community-platform.com/join";
  const memberReferrer = "https://community-platform.com";
  const memberIp = "192.168.1.100";

  const registeredMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: memberHref,
        referrer: memberReferrer,
        ip: memberIp,
      } satisfies IMember.ICreate,
    });
  typia.assert(registeredMember);

  // Retrieve the total karma for the member (should be 0 since no posts exist)
  const totalKarma: ICommunityPlatformPostKarma =
    await api.functional.communityPlatform.member.karma.post.at(connection);
  typia.assert(totalKarma);

  // Validate that the initial karma total is 0
  TestValidator.equals("initial karma total should be 0", totalKarma, "0");
}
