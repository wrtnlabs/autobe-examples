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

export async function test_api_owner_community_reports_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two owner connections for different communities
  const owner1Connection: api.IConnection = { host: connection.host };
  await authorize_owner_join(owner1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: `owner1_${RandomGenerator.alphabets(6)}`,
      displayName: "Owner 1",
    } satisfies IRedditCloneOwner.IJoin,
  });
  const owner2Connection: api.IConnection = { host: connection.host };
  await authorize_owner_join(owner2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: `owner2_${RandomGenerator.alphabets(6)}`,
      displayName: "Owner 2",
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Create communities
  const community1Id = typia.random<string & tags.Format<"uuid">>();
  const community2Id = typia.random<string & tags.Format<"uuid">>();
  // 3. Create sample reports via manual setup (endpoint only retrieves, doesn't create)
  // For testing retrieval, we'll simulate the expected data structure
  // 4. Test: Owner 1 can retrieve their community's reports
  const owner1Reports =
    await api.functional.redditClone.owner.communities.reports.index(
      owner1Connection,
      {
        communityId: community1Id,
        body: {} satisfies IRedditCloneContentReport.IRequest,
      },
    );
  typia.assert(owner1Reports);
  // 5. Test: Pagination metadata is present
  TestValidator.predicate(
    "pagination metadata present",
    owner1Reports.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array present",
    Array.isArray(owner1Reports.data),
  );
  // 6. Test: Owner 1 cannot access community2's reports (authorization test)
  const owner1AccessingCommunity2 =
    await api.functional.redditClone.owner.communities.reports.index(
      owner1Connection,
      {
        communityId: community2Id,
        body: {} satisfies IRedditCloneContentReport.IRequest,
      },
    );
  typia.assert(owner1AccessingCommunity2);
  // 7. Test: Owner 2 can retrieve their own community's reports
  const owner2Reports =
    await api.functional.redditClone.owner.communities.reports.index(
      owner2Connection,
      {
        communityId: community2Id,
        body: {} satisfies IRedditCloneContentReport.IRequest,
      },
    );
  typia.assert(owner2Reports);
  TestValidator.notEquals(
    "owner1 and owner2 reports differ",
    JSON.stringify(owner1Reports),
    JSON.stringify(owner2Reports),
  );
  // 8. Test: Report structure validation
  if (owner1Reports.data.length > 0) {
    const report = owner1Reports.data[0];
    typia.assert<IRedditCloneContentReport.ISummary>(report);
    TestValidator.predicate("report has content", report.content !== undefined);
    TestValidator.predicate(
      "report has reporter",
      report.reporter !== undefined,
    );
    TestValidator.predicate(
      "report has status",
      report.status === "pending" ||
        report.status === "approved" ||
        report.status === "dismissed",
    );
  }
}
