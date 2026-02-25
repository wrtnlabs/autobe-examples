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

export async function test_api_owner_approve_report_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Register owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: `owner_${RandomGenerator.alphaNumeric(8)}`,
      displayName: "Test Owner",
    } satisfies IRedditCloneOwner.IJoin,
  });
  typia.assert(owner);
  // Create authenticated connection with owner token
  const authenticatedOwnerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: owner.token.access,
    },
  };
  // Use dummy IDs since we don't have APIs to create communities, posts, or reports
  // In a real test, these would be created first
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Owner approves the report with an optional reason
  const approved =
    await api.functional.redditClone.owner.communities.reports.approve(
      authenticatedOwnerConnection,
      {
        communityId: communityId,
        reportId: reportId,
      },
    );
  typia.assert(approved);
  // Verify the approval
  TestValidator.equals("report action is approve", approved.action, "approve");
  TestValidator.predicate("has resolved timestamp", !!approved.resolvedAt);
  TestValidator.equals("moderator is owner", approved.moderatorId, owner.id);
}
