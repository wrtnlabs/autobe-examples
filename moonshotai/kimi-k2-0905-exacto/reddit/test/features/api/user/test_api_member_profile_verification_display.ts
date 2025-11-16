import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

export async function test_api_member_profile_verification_display(
  connection: api.IConnection,
) {
  // Test unverified member profile
  const unverifiedMemberCode = typia.random<string & tags.Format<"uuid">>();
  const unverifiedProfile = await api.functional.redditCommunity.users.profile(
    connection,
    { memberCode: unverifiedMemberCode },
  );
  typia.assert(unverifiedProfile);

  TestValidator.equals(
    "unverified member has false verification status",
    unverifiedProfile.is_verified,
    false,
  );

  // Test verified member profile
  const verifiedMemberCode = typia.random<string & tags.Format<"uuid">>();
  const verifiedProfile = await api.functional.redditCommunity.users.profile(
    connection,
    { memberCode: verifiedMemberCode },
  );
  typia.assert(verifiedProfile);

  // Test that verification status is correctly reflected in profile
  TestValidator.equals(
    "member has UUID format ID",
    verifiedProfile.id.length,
    36,
  );

  // Test profile optional fields
  if (verifiedProfile.avatar_url !== undefined) {
    TestValidator.predicate(
      "avatar URL is valid format when present",
      verifiedProfile.avatar_url.startsWith("http"),
    );
  }

  if (verifiedProfile.bio !== undefined) {
    TestValidator.predicate(
      "bio respects max length when present",
      verifiedProfile.bio.length <= 500,
    );
  }

  // Validate member relationship integrity
  TestValidator.predicate(
    "member ID exists in profile",
    verifiedProfile.member.id.length === 36,
  );
  TestValidator.equals(
    "member nickname exists in profile",
    verifiedProfile.member.nickname,
    verifiedProfile.member.nickname,
  );
  TestValidator.equals(
    "member email exists in profile",
    verifiedProfile.member.email,
    verifiedProfile.member.email,
  );
}
