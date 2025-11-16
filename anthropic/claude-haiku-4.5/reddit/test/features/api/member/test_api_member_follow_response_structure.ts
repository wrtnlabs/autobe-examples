import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

export async function test_api_member_follow_response_structure(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (the follower)
  const followerData = {
    email: typia.random<string & tags.Format<"email">>().substring(0, 50),
    username: RandomGenerator.alphabets(8),
    password: "SecurePass123!",
    ip: "127.0.0.1",
    href: "http://localhost:3000/register",
    referrer: "",
  } satisfies ICommunityPlatformMember.ICreate;

  const followerAccount = await api.functional.auth.member.join(connection, {
    body: followerData,
  });
  typia.assert(followerAccount);
  const followerId = followerAccount.id;

  // Step 2: Create second member account (the following)
  const followingData = {
    email: typia.random<string & tags.Format<"email">>().substring(0, 50),
    username: RandomGenerator.alphabets(8),
    password: "SecurePass456!",
    ip: "127.0.0.1",
    href: "http://localhost:3000/register",
    referrer: "",
  } satisfies ICommunityPlatformMember.ICreate;

  const followingAccount = await api.functional.auth.member.join(connection, {
    body: followingData,
  });
  typia.assert(followingAccount);
  const followingId = followingAccount.id;

  // Step 3: Create follow relationship
  const followResponse =
    await api.functional.communityPlatform.member.members.following.create(
      connection,
      {
        memberId: followerId,
        followingId: followingId,
      },
    );
  typia.assert(followResponse);

  // Step 4: Validate response structure
  // After typia.assert(), the response is guaranteed to match ICommunityPlatformMemberFollower
  // which includes all required fields with correct types and formats.

  // Validate the relationship ID exists and matches the expected UUID format
  TestValidator.predicate(
    "follow relationship should have valid UUID id",
    followResponse.id.length === 36,
  );

  // Validate follower member summary is present with expected structure
  TestValidator.predicate(
    "follower member summary should be present",
    followResponse.follower !== null && followResponse.follower !== undefined,
  );
  TestValidator.predicate(
    "follower should have username",
    followResponse.follower.username.length > 0,
  );
  TestValidator.predicate(
    "follower should have email",
    followResponse.follower.email.length > 0,
  );
  TestValidator.predicate(
    "follower should have email_verified flag",
    typeof followResponse.follower.email_verified === "boolean",
  );
  TestValidator.predicate(
    "follower should have account_status",
    followResponse.follower.account_status !== null &&
      followResponse.follower.account_status !== undefined,
  );
  TestValidator.predicate(
    "follower should have karma_score",
    followResponse.follower.karma_score >= 0,
  );
  TestValidator.predicate(
    "follower should have created_at timestamp",
    followResponse.follower.created_at.length > 0,
  );

  // Validate following member summary is present with expected structure
  TestValidator.predicate(
    "following member summary should be present",
    followResponse.following !== null && followResponse.following !== undefined,
  );
  TestValidator.predicate(
    "following should have username",
    followResponse.following.username.length > 0,
  );
  TestValidator.predicate(
    "following should have email",
    followResponse.following.email.length > 0,
  );
  TestValidator.predicate(
    "following should have email_verified flag",
    typeof followResponse.following.email_verified === "boolean",
  );
  TestValidator.predicate(
    "following should have account_status",
    followResponse.following.account_status !== null &&
      followResponse.following.account_status !== undefined,
  );
  TestValidator.predicate(
    "following should have karma_score",
    followResponse.following.karma_score >= 0,
  );
  TestValidator.predicate(
    "following should have created_at timestamp",
    followResponse.following.created_at.length > 0,
  );

  // Step 5: Validate follow relationship timestamp is present
  TestValidator.predicate(
    "follow relationship should have created_at timestamp",
    followResponse.created_at.length > 0,
  );

  // Step 6: Validate member identities match the request parameters
  TestValidator.equals(
    "follower id should match request memberId",
    followResponse.follower.id,
    followerId,
  );
  TestValidator.equals(
    "following id should match request followingId",
    followResponse.following.id,
    followingId,
  );

  // Step 7: Validate that follower and following are different members
  TestValidator.notEquals(
    "follower and following should be different members",
    followResponse.follower.id,
    followResponse.following.id,
  );
}
