import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerationEfficiencyMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerationEfficiencyMetrics";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderation_efficiency_metrics_retrieval_by_moderator(
  connection: api.IConnection,
) {
  const moderator: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
      } satisfies IPoliticalForumModerator.ICreate,
    });
  typia.assert(moderator);

  const metrics: IPoliticalForumModerationEfficiencyMetrics =
    await api.functional.politicalForum.moderator.dashboards.moderation_efficiency.index(
      connection,
    );
  typia.assert(metrics);
}
