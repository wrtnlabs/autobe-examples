import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportSnapshot";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_snapshot_history_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator (community owner) account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      }),
    });
  typia.assert(moderatorAuth);
  // 2. Create community (moderator becomes owner)
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create post in the community
  const post: IRedditPlatformPost =
    await generate_random_reddit_platform_member_posts_create(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
          title: RandomGenerator.name(3),
          post_type: "text",
          text_content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // 4. Create reporter account
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(reporterConnection, {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      }),
    });
  typia.assert(reporterAuth);
  // 5. Reporter creates a report on the post
  const report: IRedditPlatformReport =
    await generate_random_reddit_platform_member_reports_create(
      reporterConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          post_id: post.id,
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // 6. Moderator queries snapshot history
  const snapshots: IPageIRedditPlatformReportSnapshot =
    await api.functional.redditPlatform.member.reports.snapshots.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IRedditPlatformReportSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 7. Validate response structure
  TestValidator.equals(
    "pagination exists",
    snapshots.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 10);
  TestValidator.predicate("has snapshots", snapshots.data.length > 0);
  // 8. Validate first snapshot (newest)
  const firstSnapshot = snapshots.data[0];
  typia.assert(firstSnapshot);
  TestValidator.equals(
    "snapshot report id matches",
    firstSnapshot.report.id,
    report.id,
  );
  TestValidator.equals(
    "snapshot status is pending",
    firstSnapshot.status,
    "pending",
  );
  TestValidator.predicate(
    "has reason",
    firstSnapshot.reason !== null && firstSnapshot.reason !== undefined,
  );
}