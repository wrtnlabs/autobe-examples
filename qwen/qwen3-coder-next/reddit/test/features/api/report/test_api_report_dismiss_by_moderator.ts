import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReportResolution";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_report_dismiss_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account for authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Generate valid identifiers for test
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the dismiss endpoint with valid identifiers
  const resolution =
    await api.functional.redditClone.moderator.communities.reports.dismiss(
      moderatorConnection,
      {
        communityId,
        reportId,
      },
    );
  typia.assert(resolution);
  // 4. Validate resolution structure
  TestValidator.predicate(
    "resolution has valid id",
    resolution.id !== null && resolution.id !== undefined,
  );
  TestValidator.equals("reportId matches", resolution.reportId, reportId);
  TestValidator.equals(
    "moderatorId matches",
    resolution.moderatorId,
    moderator.id,
  );
  TestValidator.equals("action is dismiss", resolution.action, "dismiss");
  TestValidator.predicate(
    "resolvedAt is set",
    resolution.resolvedAt !== null && resolution.resolvedAt !== undefined,
  );
}
