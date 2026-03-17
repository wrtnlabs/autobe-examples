import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_reports_create } from "../../../generate/generate_random_community_member_communities_reports_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

export async function test_api_report_queue_viewed_by_owner_with_pending_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (owner) joins and creates community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 2. Member B (poster) joins and subscribes to the community
  const posterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(posterConnection, {});
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      posterConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 3. Member B creates a text post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPost.ICreate;
  const post = await api.functional.community.member.communities.posts.create(
    posterConnection,
    {
      communityId: community.id,
      body: postBody,
    },
  );
  typia.assert(post);
  // 4. Member C (reporter) joins and submits a report against the post
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {});
  const reporterUsername = reporterAuth.username;
  const reportReason = "This post contains inappropriate content";
  const report =
    await generate_random_community_member_communities_reports_create(
      reporterConnection,
      {
        params: { communityId: community.id },
        body: {
          post_id: post.id,
          reason: reportReason,
        },
      },
    );
  typia.assert(report);
  // 5. Owner calls PATCH /reports to get the pending report queue (page 1, limit 20)
  const reportQueue =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(reportQueue);
  // Validate pagination object
  TestValidator.predicate(
    "pagination.current is present",
    reportQueue.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is present",
    reportQueue.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.records is at least 1",
    reportQueue.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination.pages is at least 1",
    reportQueue.pagination.pages >= 1,
  );
  // Validate data array contains exactly 1 entry
  TestValidator.equals("report queue data length", reportQueue.data.length, 1);
  const reportEntry = reportQueue.data[0]!;
  // Validate the report entry
  TestValidator.equals("report id matches", reportEntry.id, report.id);
  TestValidator.equals(
    "report reason matches",
    reportEntry.reason,
    reportReason,
  );
  TestValidator.equals(
    "report status is pending",
    reportEntry.status,
    "pending",
  );
  TestValidator.equals(
    "reporter username matches member C",
    reportEntry.reporter.username,
    reporterUsername,
  );
  TestValidator.equals("targetType is post", reportEntry.targetType, "post");
  TestValidator.predicate("post is non-null", reportEntry.post !== null);
  TestValidator.equals("comment is null", reportEntry.comment, null);
  // Validate post data within report
  TestValidator.equals(
    "post id in report matches",
    reportEntry.post!.id,
    post.id,
  );
  // 6. Filter with targetType: 'post' — same single report should appear
  const postFilteredQueue =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          targetType: "post",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(postFilteredQueue);
  TestValidator.equals(
    "filtered by post: data length is 1",
    postFilteredQueue.data.length,
    1,
  );
  TestValidator.equals(
    "filtered by post: report id matches",
    postFilteredQueue.data[0]!.id,
    report.id,
  );
  // 7. Filter with targetType: 'comment' — should return empty data array
  const commentFilteredQueue =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          targetType: "comment",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(commentFilteredQueue);
  TestValidator.equals(
    "filtered by comment: data is empty",
    commentFilteredQueue.data.length,
    0,
  );
  // 8. Request page 2 — should be empty; pages/records reflect totals correctly
  const page2Queue =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          page: 2,
          limit: 20,
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(page2Queue);
  TestValidator.equals("page 2 data is empty", page2Queue.data.length, 0);
  TestValidator.equals(
    "page 2 records total matches page 1",
    page2Queue.pagination.records,
    reportQueue.pagination.records,
  );
  TestValidator.equals(
    "page 2 pages total matches page 1",
    page2Queue.pagination.pages,
    reportQueue.pagination.pages,
  );
}
