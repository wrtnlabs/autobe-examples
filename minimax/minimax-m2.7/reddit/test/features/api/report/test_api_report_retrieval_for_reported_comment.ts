import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
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
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

export async function test_api_report_retrieval_for_reported_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member1 who will be the community owner and moderator
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  // 2. Create a community 'testcommunity2' with member1 as owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {
        body: {
          name: "testcommunity2",
          description: "A community for testing report retrieval on comments",
        },
      },
    );
  typia.assert(community);
  // 3. Authenticate as member2 who will author the post and comment
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  // 4. Subscribe member2 to 'testcommunity2' (required for posting)
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 5. Create a text post by member2 in 'testcommunity2'
  const post = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        title: "Test post for comment report",
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 6. Create a comment on the post by member2
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      member2Connection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: "This is a test comment that will be reported",
        },
      },
    );
  typia.assert(comment);
  // 7. Authenticate as member3 who will be the reporter
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {});
  // 8. Subscribe member3 to 'testcommunity2' (required for reporting)
  await generate_random_reddit_clone_member_subscriptions_create(
    member3Connection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 9. Submit a report against the comment with reason 'Harassment'
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      member3Connection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          target_type: "comment",
          target_id: comment.id,
          reason: "Harassment",
        },
      },
    );
  typia.assert(report);
  // 10. As member1 (moderator), retrieve the specific report by reportId
  // member1Connection is already authenticated from step 1 and used to create the community
  const retrievedReport =
    await api.functional.redditClone.member.communities.reports.at(
      member1Connection,
      {
        communityName: community.name,
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // 11. Verify response contains expected fields
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "reporter username is member3",
    retrievedReport.reporter.username,
    member3.username,
  );
  TestValidator.equals(
    "community name matches",
    retrievedReport.community.name,
    community.name,
  );
  TestValidator.equals(
    "target type is comment",
    retrievedReport.target_type,
    "comment",
  );
  TestValidator.equals(
    "target ID matches comment",
    retrievedReport.target_id,
    comment.id,
  );
  TestValidator.equals(
    "reason is Harassment",
    retrievedReport.reason,
    "Harassment",
  );
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
}
