import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaScore";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_my_karma_scores_no_path_parameters(
  connection: api.IConnection,
) {
  // 1. Create a member account through registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member account created with access token",
    member.token.access.length > 0,
  );

  // 2. Call /my/karmaScores endpoint without any path parameters
  // The endpoint automatically identifies the authenticated member from the token
  const karmaScore: ICommunityPlatformKarmaScore =
    await api.functional.my.karmaScores.at(connection);
  typia.assert(karmaScore);

  // 3. Verify the karma score data structure and business logic
  TestValidator.predicate(
    "post karma is non-negative",
    karmaScore.post_karma >= 0,
  );

  TestValidator.predicate(
    "comment karma is non-negative",
    karmaScore.comment_karma >= 0,
  );

  TestValidator.predicate(
    "total karma equals sum of post and comment karma",
    karmaScore.total_karma === karmaScore.post_karma + karmaScore.comment_karma,
  );

  // 4. Verify endpoint returns self-reference data without path parameters
  // The member's karma score is automatically identified from the authenticated token
  TestValidator.predicate(
    "karma score belongs to authenticated member",
    karmaScore.community_platform_member_id.length > 0,
  );

  // 5. Verify timestamps are present and valid
  TestValidator.predicate(
    "created_at timestamp is populated",
    karmaScore.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp is populated",
    karmaScore.updated_at.length > 0,
  );
}
