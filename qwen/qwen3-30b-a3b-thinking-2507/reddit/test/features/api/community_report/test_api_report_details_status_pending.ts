import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_reports_create } from "../../../generate/generate_random_community_member_reports_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_report_details_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const username = RandomGenerator.name();
  await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username,
    },
  });
  // 2. Create community
  const community = await generate_random_community_member_communities_create(
    userConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  // 3. Create post in community
  const post = await api.functional.community.member.communities.posts.create(
    userConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.name(2),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // 4. Create report for the post
  const report = await generate_random_community_member_reports_create(
    userConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        community_post_id: post.id,
      },
    },
  );
  // 5. Verify the report details
  const fetchedReport = await api.functional.community.member.reports.at(
    userConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(fetchedReport);
  // Check status is 'pending'
  TestValidator.equals(
    "status should be pending",
    fetchedReport.status,
    "pending",
  );
  // Check reason has at least 5 characters
  TestValidator.predicate(
    "reason should have min 5 chars",
    fetchedReport.reason.length >= 5,
  );
  // Check reporter display name (from reporter summary)
  TestValidator.equals(
    "reporter display name should match",
    fetchedReport.reporter.display_name,
    username,
  );
  // Check context of reported content
  TestValidator.equals(
    "reporter should reference post",
    fetchedReport.post?.id,
    post.id,
  );
  TestValidator.equals(
    "report should match post title",
    fetchedReport.post?.title,
    post.title,
  );
}
