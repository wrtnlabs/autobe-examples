import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_report_dismissal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register moderator via utility function
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  // 2. Obtain a report ID (randomly generated UUID to simulate a legitimate report)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Dismiss the report using empty body as defined by DTO ICommunityReport.IUpdate = {}
  const dismissedReport =
    await api.functional.community.moderator.reports.update(
      moderatorConnection,
      {
        reportId,
        body: {} satisfies ICommunityReport.IUpdate,
      },
    );
  typia.assert(dismissedReport);
}
