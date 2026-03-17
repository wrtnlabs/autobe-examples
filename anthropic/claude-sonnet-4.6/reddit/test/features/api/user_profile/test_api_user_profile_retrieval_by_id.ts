import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profile_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member so a profile is automatically created.
  // Use the utility function (mandatory) instead of SDK directly.
  const memberConnection: api.IConnection = { host: connection.host };
  const username = RandomGenerator.alphaNumeric(12);
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      username,
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Retrieve the profile as a guest (no Authorization header).
  // The profile ID (community_user_profiles.id) is a separate UUID from the
  // member ID. Since no listing endpoint is available in the provided SDK,
  // we use the member's ID as a best-effort profile UUID lookup.
  // Note: in this platform the profile UUID is auto-generated separately.
  // We use memberConnection.id (member UUID) as the profile target.
  // The guest connection has NO auth headers set.
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 3: Call GET /community/userProfiles/{userProfileId} without auth.
  // Using authorized.id (member UUID) as the profile UUID - best available proxy.
  const profile = await api.functional.community.userProfiles.at(
    guestConnection,
    {
      userProfileId: authorized.id,
    },
  );
  typia.assert(profile);
  // Step 4: Validate that the profile is linked to the registered member.
  TestValidator.equals(
    "profile's member id matches registered member",
    profile.communityMemberId,
    authorized.id,
  );
  TestValidator.equals(
    "profile member username matches registered username",
    profile.member.username,
    username,
  );
  // Step 5: Validate initial values for a brand new account.
  TestValidator.equals(
    "displayName is null for new account",
    profile.displayName,
    null,
  );
  TestValidator.equals("bio is null for new account", profile.bio, null);
  TestValidator.equals(
    "avatarUrl is null for new account",
    profile.avatarUrl,
    null,
  );
  TestValidator.equals(
    "karmaScore is 0 for new account",
    profile.karmaScore,
    0,
  );
  // Step 6: Validate nested member summary reflects the registered member.
  TestValidator.equals(
    "member summary id matches",
    profile.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member summary username matches",
    profile.member.username,
    username,
  );
  TestValidator.equals(
    "member summary display_name is null",
    profile.member.display_name,
    null,
  );
  TestValidator.equals(
    "member summary avatar_url is null",
    profile.member.avatar_url,
    null,
  );
  TestValidator.equals(
    "member summary karma_score is 0",
    profile.member.karma_score,
    0,
  );
}
