import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_report_approval_success(
  connection: api.IConnection,
) {
  // 1. Create a new moderator and obtain authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinBody =
    typia.random<ICommunityPlatformModerator.IJoin>() satisfies ICommunityPlatformModerator.IJoin;
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. As the scenario requires approving an existing report,
  //    but there is no API to create a report in the given specs,
  //    simulate a valid reportId as a realistic UUID.
  //    This is a limitation since creating a concrete report is out of scope.
  const reportId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  // 3. Approve the report using the reportId and moderator authorization
  const decision =
    await api.functional.communityPlatform.moderator.community.reports.approve.approveReport(
      moderatorConnection,
      {
        reportId,
      },
    );
  // 4. Assert the response is a valid report decision
  typia.assert(decision);
  // 5. Optionally validate response fields if they exist (we only know decision is an object)
  //    Since the DTO ICommunityPlatformReportDecision is empty, no further validation on fields.
}
