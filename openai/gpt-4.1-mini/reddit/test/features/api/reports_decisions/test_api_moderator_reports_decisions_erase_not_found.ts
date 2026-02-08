import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_reports_decisions_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test deleting a report decision with a non-existing reportDecisionId should return 404 error
  // 1. Moderator registration and authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityPlatformModerator.IJoin,
  });
  // 2. Attempt to delete a non-existing report decision id and expect 404 error
  const fakeReportDecisionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existing report decision should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.reportsDecisions.erase(
        moderatorConnection,
        {
          reportDecisionId: fakeReportDecisionId,
        },
      );
    },
  );
}
