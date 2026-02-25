import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_vote_karma_impact_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Authenticate as moderator using utility function
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Generate a random karma impact ID to retrieve
  const karmaImpactId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the karma impact record using moderator-specific connection
  const karmaImpact =
    await api.functional.communityPlatform.moderator.vote_karma_impacts.at(
      moderatorConnection,
      { karmaImpactId },
    );
  // Validate the response structure - this performs complete validation
  typia.assert(karmaImpact);
  // Validate business logic relationships
  TestValidator.equals(
    "karma impact ID matches",
    karmaImpact.id,
    karmaImpactId,
  );
  TestValidator.predicate(
    "period end is after period start",
    new Date(karmaImpact.period_end) > new Date(karmaImpact.period_start),
  );
  TestValidator.predicate(
    "vote ratio is between 0 and 1",
    karmaImpact.vote_ratio >= 0 && karmaImpact.vote_ratio <= 1,
  );
  TestValidator.predicate(
    "error rate is non-negative",
    karmaImpact.error_rate >= 0,
  );
  TestValidator.predicate(
    "system utilization metrics are valid",
    karmaImpact.system_cpu_utilization >= 0 &&
      karmaImpact.system_cpu_utilization <= 100 &&
      karmaImpact.system_memory_utilization >= 0 &&
      karmaImpact.system_memory_utilization <= 100,
  );
}
