import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reddit_platform_reports_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_reports_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_resolution_approved_with_notes(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(16),
        username: RandomGenerator.name(2),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // Create a post
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "TEXT",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Submit a report for the post
  const report =
    await api.functional.redditPlatform.member.redditPlatform.reports.create(
      memberConnection,
      {
        body: {
          reported_type: "POST",
          reported_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // Execute: Resolve the report with notes
  const resolution =
    await api.functional.redditPlatform.member.redditPlatform.reports.resolutions.update(
      memberConnection,
      {
        reportId: report.id,
        body: {
          status: "RESOLVED",
          resolution_notes: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformReportResolution.IUpdate,
      },
    );
  typia.assert(resolution);
  // Validation: Check resolution status and notes
  TestValidator.equals(
    "resolution status is RESOLVED",
    resolution.status,
    "RESOLVED",
  );
  TestValidator.predicate(
    "resolution has notes",
    resolution.resolution_notes !== null &&
      resolution.resolution_notes !== undefined,
  );
}
