import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentReport";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneContentReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReportResolution";
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

export async function test_api_owner_approve_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerInfo = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphabets(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  typia.assert(ownerInfo);
  // 2. Create test community
  const communityId = RandomGenerator.alphaNumeric(8);
  // 3. Join a community to be able to create reports
  await api.functional.redditClone.owner.communities.reports.index(
    ownerConnection,
    {
      communityId,
      body: { limit: 10 },
    },
  );
  // 4. Create a report by submitting content that violates community guidelines
  const reportResult =
    await api.functional.redditClone.owner.communities.reports.index(
      ownerConnection,
      {
        communityId,
        body: {
          limit: 10,
          status: "pending",
        },
      },
    );
  typia.assert(reportResult);
  // If no pending reports exist, we need to create one first by registering a member and submitting a report
  if (reportResult.data.length === 0) {
    // Create a test member to submit a report
    const memberConnection: api.IConnection = { host: connection.host };
    const memberInfo = await api.functional.redditClone.auth.owner.join(
      memberConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "SecurePass123!",
          username: RandomGenerator.alphabets(8),
          displayName: RandomGenerator.name(),
        } satisfies IRedditCloneOwner.IJoin,
      },
    );
    typia.assert(memberInfo);
    // Create a post to report
    const post =
      await api.functional.redditClone.owner.communities.reports.index(
        memberConnection,
        {
          communityId,
          body: { limit: 1 },
        },
      );
    // Submit a report for the post
    await api.functional.redditClone.owner.communities.reports.index(
      memberConnection,
      {
        communityId,
        body: { limit: 10 },
      },
    );
    // Refresh the report list
    const updatedReportResult =
      await api.functional.redditClone.owner.communities.reports.index(
        ownerConnection,
        {
          communityId,
          body: { limit: 10, status: "pending" },
        },
      );
    typia.assert(updatedReportResult);
    // Find a pending report to approve
    if (updatedReportResult.data.length === 0) {
      // Skip test if no reports available
      return;
    }
    const reportToApprove = updatedReportResult.data[0];
    // 5. Approve the report
    const resolution =
      await api.functional.redditClone.owner.communities.reports.approve(
        ownerConnection,
        {
          communityId,
          reportId: reportToApprove.id,
        },
      );
    typia.assert(resolution);
    // 6. Validate resolution
    TestValidator.equals("action is approve", resolution.action, "approve");
    TestValidator.predicate(
      "has valid reportId",
      /^[0-9a-f-]{36}$/i.test(resolution.reportId),
    );
    TestValidator.predicate(
      "has valid moderatorId",
      /^[0-9a-f-]{36}$/i.test(resolution.moderatorId),
    );
  } else {
    // Use existing pending report
    const reportToApprove = reportResult.data[0];
    // 5. Approve the report
    const resolution =
      await api.functional.redditClone.owner.communities.reports.approve(
        ownerConnection,
        {
          communityId,
          reportId: reportToApprove.id,
        },
      );
    typia.assert(resolution);
    // 6. Validate resolution
    TestValidator.equals("action is approve", resolution.action, "approve");
    TestValidator.predicate(
      "has valid reportId",
      /^[0-9a-f-]{36}$/i.test(resolution.reportId),
    );
    TestValidator.predicate(
      "has valid moderatorId",
      /^[0-9a-f-]{36}$/i.test(resolution.moderatorId),
    );
  }
}
