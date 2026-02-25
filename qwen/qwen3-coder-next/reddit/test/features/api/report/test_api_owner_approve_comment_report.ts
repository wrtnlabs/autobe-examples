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

export async function test_api_owner_approve_comment_report(
  connection: api.IConnection,
): Promise<void> {
  // Create owner connection and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: "owner@test.com" as string & tags.Format<"email">,
      password: "SecurePass123!" as string & tags.MinLength<8>,
      username: "owner123",
      displayName: "Owner Test",
    } satisfies IRedditCloneOwner.IJoin,
  });
  // Create a test community (using mock data since IRedditCloneCommunity not available)
  const communityName = RandomGenerator.alphabets(8);
  // Note: Community creation not available in provided API - skip setup
  // Create a regular user (using mock data since IRedditCloneMember.IJoin not available)
  const userConnection: api.IConnection = { host: connection.host };
  // Note: User registration not available in provided API - skip setup
  // Create a comment on a post (using mock data since post/comment creation not available)
  const postId = "123e4567-e89b-12d3-a456-426614174000";
  const commentId = "223e4567-e89b-12d3-a456-426614174000";
  // Create another user reports the comment (using mock data)
  const reporterConnection: api.IConnection = { host: connection.host };
  // Create a mock report (using IRedditCloneContentReport.ISummary as reference)
  // Note: IRedditCloneContentReport.ICreate not available
  // Owner retrieves pending reports for the community
  const reportsResult =
    await api.functional.redditClone.owner.communities.reports.index(
      ownerConnection,
      {
        communityId: "123e4567-e89b-12d3-a456-426614174000",
        body: {
          status: "pending",
        } satisfies IRedditCloneContentReport.IRequest,
      },
    );
  typia.assert(reportsResult);
  // Get the first report from the list
  const foundReport = reportsResult.data[0];
  TestValidator.equals(
    "report found in pending list",
    foundReport?.status,
    "pending",
  );
  // Owner approves the comment report
  const resolution =
    await api.functional.redditClone.owner.communities.reports.approve(
      ownerConnection,
      {
        communityId: "123e4567-e89b-12d3-a456-426614174000",
        reportId: foundReport.id,
      },
    );
  typia.assert(resolution);
  // Validate the resolution
  TestValidator.equals(
    "resolution reportId matches",
    resolution.reportId,
    foundReport.id,
  );
  TestValidator.equals(
    "resolution action is approve",
    resolution.action,
    "approve",
  );
  TestValidator.predicate(
    "resolution has moderatorId",
    resolution.moderatorId !== null && resolution.moderatorId !== undefined,
  );
  TestValidator.predicate(
    "resolution has resolvedAt timestamp",
    new Date(resolution.resolvedAt).toISOString() !== "Invalid Date",
  );
  // Verify report status changed to approved by checking reports list again
  const updatedReportsResult =
    await api.functional.redditClone.owner.communities.reports.index(
      ownerConnection,
      {
        communityId: "123e4567-e89b-12d3-a456-426614174000",
        body: {},
      },
    );
  typia.assert(updatedReportsResult);
  // Find the updated report
  const updatedReport = updatedReportsResult.data.find(
    (r) => r.id === foundReport.id,
  );
  TestValidator.equals(
    "report status changed to approved",
    updatedReport?.status,
    "approved",
  );
}
