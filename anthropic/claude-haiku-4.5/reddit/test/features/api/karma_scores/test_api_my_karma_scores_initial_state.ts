import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_my_karma_scores_initial_state(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const joinTimestamp = new Date();
  const newMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "Password123!@#",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(newMember);

  // Step 2: Retrieve karma scores immediately after joining
  const karmaScore: ICommunityPlatformKarmaScore =
    await api.functional.my.karmaScores.at(connection);
  typia.assert(karmaScore);

  // Step 3: Validate that all karma values are initialized to zero
  TestValidator.equals("post_karma should be 0", karmaScore.post_karma, 0);
  TestValidator.equals(
    "comment_karma should be 0",
    karmaScore.comment_karma,
    0,
  );
  TestValidator.equals("total_karma should be 0", karmaScore.total_karma, 0);

  // Step 4: Verify that created_at and updated_at are recent
  const createdAtTime = new Date(karmaScore.created_at).getTime();
  const updatedAtTime = new Date(karmaScore.updated_at).getTime();
  const joinTime = joinTimestamp.getTime();

  // Allow 5 second tolerance for timestamp differences
  const timeTolerance = 5000;

  TestValidator.predicate(
    "created_at should be close to join time",
    Math.abs(createdAtTime - joinTime) <= timeTolerance,
  );

  TestValidator.predicate(
    "updated_at should be close to join time",
    Math.abs(updatedAtTime - joinTime) <= timeTolerance,
  );

  // Step 5: Verify created_at equals updated_at (both at creation time)
  TestValidator.equals(
    "created_at and updated_at should be equal at initial state",
    karmaScore.created_at,
    karmaScore.updated_at,
  );
}
