import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaLedger";

export async function test_api_user_karma_retrieval(
  connection: api.IConnection,
) {
  const userId = typia.random<string & tags.Format<"uuid">>();
  const karma: ICommunityPlatformKarmaLedger =
    await api.functional.communityPlatform.users.karma.at(connection, {
      userId,
    });
  typia.assert(karma);

  // Validate range constraints on numerical values
  TestValidator.predicate(
    "total score is within valid range",
    karma.total_score >= -1000 && karma.total_score <= 100000,
  );
  TestValidator.predicate(
    "recent change is within valid range",
    karma.recent_change >= -50 && karma.recent_change <= 50,
  );
  TestValidator.predicate(
    "karma history count is non-negative",
    karma.karma_history_count >= 0,
  );

  // Validate string format and empty values
  TestValidator.predicate(
    "trend is valid value",
    ["upward", "downward", "stable"].includes(karma.trend),
  );
  TestValidator.predicate(
    "first earned badge is not empty",
    karma.first_earned_badge.length > 0,
  );

  // Validate boolean
  TestValidator.predicate(
    "badge eligible is boolean",
    typeof karma.badge_eligible === "boolean",
  );

  // Test error case: invalid user ID
  await TestValidator.error("invalid user ID should return 404", async () => {
    await api.functional.communityPlatform.users.karma.at(connection, {
      userId: "invalid-uuid",
    });
  });
}
