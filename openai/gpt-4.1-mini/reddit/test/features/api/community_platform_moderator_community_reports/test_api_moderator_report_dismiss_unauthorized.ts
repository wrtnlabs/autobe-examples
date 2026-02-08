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

export async function test_api_moderator_report_dismiss_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test dismissal attempt by an unauthorized user (not logged in as moderator).
  // The system should reject the request with an unauthorized error.
  // No report status should be changed.
  // Ensure the security enforcement denies access to dismiss operation without proper moderator authorization.
  // Step 1: Perform the moderator join to satisfy dependency (not used after)
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(joinConnection, {
    body: {},
  });
  // Step 2: Attempt dismissal without moderator authorization connection
  const unauthConnection: api.IConnection = { host: connection.host };
  const randomReportId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Expect to throw HTTP 401 Unauthorized error due to lack of auth token
  await TestValidator.httpError("unauthorized dismissal", 401, async () => {
    await api.functional.communityPlatform.moderator.community.reports.dismiss(
      unauthConnection,
      { reportId: randomReportId },
    );
  });
}
