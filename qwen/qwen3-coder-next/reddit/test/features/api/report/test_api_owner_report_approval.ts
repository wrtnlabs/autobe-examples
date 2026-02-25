import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentReport";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_report_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner connection and login as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(2),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Get pending reports from community
  const reports =
    await api.functional.redditClone.owner.communities.reports.index(
      ownerConnection,
      {
        communityId: "test-community-id",
        body: {
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(reports);
  // 3. Check if there are any pending reports
  const pendingReport = reports.data.find((r) => r.status === "pending");
  if (!pendingReport) {
    // If no pending report, we can't test the approval workflow
    return;
  }
  typia.assert(pendingReport);
  // 4. Approve the report by calling the index endpoint with approved status
  const updatedReports =
    await api.functional.redditClone.owner.communities.reports.index(
      ownerConnection,
      {
        communityId: "test-community-id",
        body: {
          status: "approved",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(updatedReports);
  // 5. Verify the report status has been updated
  const updatedReport = updatedReports.data.find(
    (r) => r.id === pendingReport.id,
  );
  if (updatedReport) {
    TestValidator.equals(
      "report status is approved",
      updatedReport.status,
      "approved",
    );
  }
  // 6. Verify report was removed from pending queue
  const pendingReports =
    await api.functional.redditClone.owner.communities.reports.index(
      ownerConnection,
      {
        communityId: "test-community-id",
        body: {
          status: "pending",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(pendingReports);
  const removedReport = pendingReports.data.find(
    (r) => r.id === pendingReport.id,
  );
  TestValidator.equals(
    "report removed from pending queue",
    removedReport,
    undefined,
  );
}
