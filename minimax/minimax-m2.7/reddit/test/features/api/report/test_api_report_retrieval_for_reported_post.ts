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

export async function test_api_report_retrieval_for_reported_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member1 who will be the community owner and moderator
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  // 2. Create the community where the report will be filed
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {
        body: {
          name: "testcommunity",
          description: "Test community for report retrieval",
        },
      },
    );
  // 3. Authenticate as member2 who will author the reported content
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  // 4. Create the post that will be reported - member2 must be subscribed to post
  // Note: Since member2 just registered, they should be subscribed to the community
  // We'll create the post with member2's connection
  const post = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        title: "Test post for reporting",
        communityName: community.name,
        type: "text" as const,
      },
    },
  );
  // 5. Create the report against the post that will be retrieved
  // As member1 (moderator), submit a report on member2's post
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      member1Connection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          target_type: "post" as const,
          target_id: post.id,
          reason: "Spam content",
        },
      },
    );
  // 6. As member1 (moderator), retrieve the specific report by reportId
  const retrievedReport =
    await api.functional.redditClone.member.communities.reports.at(
      member1Connection,
      {
        communityName: community.name,
        reportId: report.id,
      },
    );
  // 7. Verify response contains expected values
  typia.assert(retrievedReport);
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "reporter username is member1",
    retrievedReport.reporter.username,
    member1.username,
  );
  TestValidator.equals(
    "community name matches",
    retrievedReport.community.name,
    community.name,
  );
  TestValidator.equals(
    "target type is post",
    retrievedReport.target_type,
    "post",
  );
  TestValidator.equals(
    "target ID matches post ID",
    retrievedReport.target_id,
    post.id,
  );
  TestValidator.equals(
    "reason is 'Spam content'",
    retrievedReport.reason,
    "Spam content",
  );
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
}
