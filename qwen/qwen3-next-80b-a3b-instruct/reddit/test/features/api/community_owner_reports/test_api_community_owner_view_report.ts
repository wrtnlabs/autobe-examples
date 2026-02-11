import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_owner_view_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityOwner.IJoin;
  const authResponse = await authorize_community_owner_join(ownerConnection, {
    body: ownerCredentials,
  });
  typia.assert(authResponse);
  // 2. Create comment report (through an external process)
  // Since we can't directly create reports, we simulate by using random valid UUID
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch the report as the authenticated owner
  const report = await api.functional.redditCommunity.communityOwner.reports.at(
    ownerConnection,
    {
      reportId,
    },
  );
  typia.assert(report);
  // 4. Validate report structure
  TestValidator.equals("report ID matches", report.id, reportId);
}
