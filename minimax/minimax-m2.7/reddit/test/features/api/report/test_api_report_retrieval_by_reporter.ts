import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

export async function test_api_report_retrieval_by_reporter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityName: community.name,
      },
    },
  );
  typia.assert(post);
  // 4. Submit a report against the post
  const reportReason = "This post contains inappropriate content.";
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      memberConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          target_type: "post",
          target_id: post.id,
          reason: reportReason,
        },
      },
    );
  typia.assert(report);
  // 5. Retrieve the report by its ID
  const retrievedReport = await api.functional.redditClone.member.reports.at(
    memberConnection,
    {
      reportId: report.id,
    },
  );
  typia.assert(retrievedReport);
  // 6. Validate retrieved report
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "target_type is post",
    retrievedReport.target_type,
    "post",
  );
  TestValidator.equals(
    "target_id matches post",
    retrievedReport.target_id,
    post.id,
  );
  TestValidator.equals(
    "reason matches submitted",
    retrievedReport.reason,
    reportReason,
  );
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
  TestValidator.equals(
    "reporter username matches",
    retrievedReport.reporter.username,
    authorized.username,
  );
  TestValidator.equals(
    "community name matches",
    retrievedReport.community.name,
    community.name,
  );
}
