import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_resolution_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test non-existent resolution (404 error path)
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("non-existent resolution returns 404", async () => {
    await api.functional.redditCommunity.admin.report_resolutions.at(
      adminConnection,
      {
        resolutionId: nonExistentId,
      },
    );
  });
  // 3. Test with valid resolution in simulate mode
  const randomResolutionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const resolution =
    await api.functional.redditCommunity.admin.report_resolutions.at(
      adminConnection,
      {
        resolutionId: randomResolutionId,
      },
    );
  typia.assert(resolution);
  // Validate resolution structure
  TestValidator.equals(
    "resolution has valid id",
    resolution.id !== undefined,
    true,
  );
  TestValidator.equals(
    "resolution has valid resolution_type",
    resolution.resolution_type !== undefined,
    true,
  );
  TestValidator.equals(
    "resolution has valid status",
    resolution.status !== undefined,
    true,
  );
  // Validate admin reference exists
  typia.assert(resolution.admin);
  TestValidator.equals(
    "admin has valid id",
    resolution.admin.id !== undefined,
    true,
  );
  TestValidator.equals(
    "admin has valid email",
    resolution.admin.email !== undefined,
    true,
  );
  // Validate report reference exists
  typia.assert(resolution.report);
  TestValidator.equals(
    "report has valid id",
    resolution.report.id !== undefined,
    true,
  );
  // Validate target content references (check both null and undefined)
  if (resolution.targetPost != null) {
    const targetPost = typia.assert(resolution.targetPost!);
    TestValidator.equals(
      "target post has valid id",
      targetPost.id !== undefined,
      true,
    );
    TestValidator.equals(
      "target post has valid title",
      targetPost.title !== undefined,
      true,
    );
  }
  if (resolution.targetComment != null) {
    const targetComment = typia.assert(resolution.targetComment!);
    TestValidator.equals(
      "target comment has valid id",
      targetComment.id !== undefined,
      true,
    );
    TestValidator.equals(
      "target comment has valid content",
      targetComment.content !== undefined,
      true,
    );
  }
  // Validate timestamps are ISO format
  TestValidator.equals(
    "created_at is valid datetime",
    !!resolution.created_at.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
    true,
  );
  TestValidator.equals(
    "updated_at is valid datetime",
    !!resolution.updated_at.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
    true,
  );
  TestValidator.equals(
    "resolved_at is nullable datetime",
    resolution.resolved_at === null ||
      resolution.resolved_at!.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
    true,
  );
  // Validate soft delete filter
  TestValidator.equals(
    "active resolution not deleted",
    resolution.deleted_at === null,
    true,
  );
}
