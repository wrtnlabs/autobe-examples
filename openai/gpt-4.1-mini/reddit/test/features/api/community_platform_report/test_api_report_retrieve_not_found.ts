import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_report_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator Authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(authorized);
  moderatorConnection.headers = {
    ...moderatorConnection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Define a non-existent reportId (valid UUID format but unlikely to exist)
  const fakeReportId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;
  // 3. Attempt to retrieve report by non-existent reportId and assert the 404 error
  await TestValidator.httpError(
    "report retrieval with non-existent reportId",
    404,
    async () => {
      await api.functional.communityPlatform.reports.at(moderatorConnection, {
        reportId: fakeReportId,
      });
    },
  );
}
