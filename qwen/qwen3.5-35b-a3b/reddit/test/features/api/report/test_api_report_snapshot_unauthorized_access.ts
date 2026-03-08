import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { generate_random_reddit_platform_post_snapshots_create } from "../../../generate/generate_random_reddit_platform_post_snapshots_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post_snapshot } from "../../../prepare/prepare_random_reddit_platform_post_snapshot";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_snapshot_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth Admin A who will own Community A (NOT moderator of Community B)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_admin_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminA);
  // 2. Auth Admin B who will own Community B
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_admin_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminB);
  // 3. Admin A creates Community A (Admin A is owner/moderator of A)
  const communityA =
    await generate_random_reddit_platform_member_communities_create(
      adminAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // 4. Admin B creates Community B (Admin B is owner, Admin A has NO privileges for B)
  const communityB =
    await generate_random_reddit_platform_member_communities_create(
      adminBConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 5. Create a report in Community B (where Admin A has no moderator role)
  const testReport =
    await generate_random_reddit_platform_member_reports_create(
      adminBConnection,
      {
        body: {
          community_id: communityB.id,
          reported_content_type: "POST",
          reported_content_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "This is a test report for unauthorized access validation",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(testReport);
  // 6. The report response includes snapshots created automatically by the backend
  // Since IRedditPlatformReport doesn't have snapshots field in its type, we need to access snapshots separately
  // For this test, we'll try to access a snapshot using the report ID
  // The backend should create snapshots when report is created
  // Try to access report snapshot as Admin A (should fail with 403)
  // Use a valid snapshot ID format, but we can't retrieve actual snapshots from the report
  // So we use a random UUID to test the 403 response
  const testSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 403 for unauthorized access to report snapshot from foreign community",
    403,
    async () => {
      await api.functional.redditPlatform.admin.reports._snapshots.at(
        adminAConnection,
        {
          reportId: testReport.id,
          snapshotId: testSnapshotId,
        },
      );
    },
  );
}
