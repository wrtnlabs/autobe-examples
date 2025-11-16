import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformKarmaTracker } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaTracker";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_karma_tracker_initialization(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through join operation
  // Generate random but valid member registration data
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123!",
    href: "https://community-platform.com/join",
    referrer: "https://community-platform.com",
    ip: "192.168.1.100",
  } satisfies IMember.ICreate;

  // Execute member join operation to authenticate and establish connection
  const joinedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinData,
    });
  typia.assert(joinedMember);

  // Step 2: Retrieve the karma tracker data for the newly created member
  // The karma tracker should be initialized to zero for brand new members
  const karmaTracker: ICommunityPlatformKarmaTracker =
    await api.functional.communityPlatform.member.karma.tracker.at(connection);
  typia.assert(karmaTracker);

  // Step 3: Validate that the karma tracker is correctly initialized to zero
  // The karma tracker is a string type, and should equal "0" for new members
  TestValidator.equals(
    "new member karma tracker initializes to zero",
    karmaTracker,
    "0",
  );
}
