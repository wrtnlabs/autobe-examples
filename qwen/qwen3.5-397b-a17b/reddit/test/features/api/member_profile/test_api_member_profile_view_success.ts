import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a user's public profile information successfully.
 *
 * This test verifies the complete workflow:
 * 1. Create a member account with unique email, password, and username
 * 2. Fetch the profile using the member's UUID
 * 3. Verify response includes all public profile fields (via typia.assert)
 * 4. Verify avatar is null (no avatar uploaded)
 * 5. Verify karma_score starts at 0 for new member
 */
export async function test_api_member_profile_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Fetch profile using member ID
  const profile = await api.functional.redditCommunity.members.at(connection, {
    memberId: memberAuth.id,
  });
  typia.assert(profile);
  // 3. Verify karma starts at 0 for new member (business logic validation)
  TestValidator.equals("karma starts at 0", profile.karma_score, 0);
  // 4. Verify avatar is null (no avatar uploaded - business state)
  TestValidator.equals("avatar is null", profile.avatar, null);
}
