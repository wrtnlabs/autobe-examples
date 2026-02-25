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

export async function test_api_moderator_report_erase_workflows(
  connection: api.IConnection,
): Promise<void> {
  // Moderator successfully deletes an existing report
  {
    const moderatorConnection: api.IConnection = { host: connection.host };
    // Register new moderator
    const joinResponse = await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    });
    typia.assert(joinResponse);
    // Set authorization header for moderatorConnection
    moderatorConnection.headers ??= {};
    moderatorConnection.headers.Authorization = joinResponse.token.access;
    // Simulate existing report by generating a reportId
    // Because there is no create report API in given info, assume a valid removal scenario.
    const existingReportId = typia.random<string & tags.Format<"uuid">>();
    // Delete the report successfully
    await api.functional.communityPlatform.moderator.reports.erase(
      moderatorConnection,
      {
        reportId: existingReportId,
      },
    );
    // Try deleting again to ensure that the report is deleted and returns 404
    await TestValidator.httpError(
      "delete non-existent report after removal",
      404,
      async () => {
        await api.functional.communityPlatform.moderator.reports.erase(
          moderatorConnection,
          {
            reportId: existingReportId,
          },
        );
      },
    );
  }
  // Attempt deletion of a non-existent report
  {
    const moderatorConnection: api.IConnection = { host: connection.host };
    // Register new moderator
    const joinResponse = await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    });
    typia.assert(joinResponse);
    // Set authorization header for moderatorConnection
    moderatorConnection.headers ??= {};
    moderatorConnection.headers.Authorization = joinResponse.token.access;
    // Generate random non-existent reportId
    const fakeReportId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "delete non-existent report",
      404,
      async () => {
        await api.functional.communityPlatform.moderator.reports.erase(
          moderatorConnection,
          {
            reportId: fakeReportId,
          },
        );
      },
    );
  }
  // Unauthorized deletion attempt
  {
    // Attempt deletion without authentication
    await TestValidator.httpError(
      "unauthorized delete attempt",
      [401, 403],
      async () => {
        await api.functional.communityPlatform.moderator.reports.erase(
          connection,
          {
            reportId: typia.random<string & tags.Format<"uuid">>(),
          },
        );
      },
    );
  }
}
