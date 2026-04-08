import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
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
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_report } from "../../../prepare/prepare_random_reddit_clone_community_report";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_report_approval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (owner/moderator) joins and creates a community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: `moderator_${RandomGenerator.alphabets(8)}`,
      href: "https://example.com/register",
      referrer: "https://google.com",
    },
  });
  typia.assert(memberAAuthorized);
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 2. Member B joins, subscribes to community, and creates a post
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: `poster_${RandomGenerator.alphabets(8)}`,
      href: "https://example.com/register",
      referrer: "https://google.com",
    },
  });
  typia.assert(memberBAuthorized);
  await generate_random_reddit_clone_member_subscriptions_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  const violatingPost = await generate_random_reddit_clone_member_posts_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
        title: "This post violates community guidelines",
        type: "text",
        body: "Spam content that should be removed by moderators.",
      },
    },
  );
  typia.assert(violatingPost);
  // 3. Member C joins, subscribes to community, and files a report
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuthorized = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: `reporter_${RandomGenerator.alphabets(8)}`,
      href: "https://example.com/register",
      referrer: "https://google.com",
    },
  });
  typia.assert(memberCAuthorized);
  await generate_random_reddit_clone_member_subscriptions_create(
    memberCConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      memberCConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          target_type: "post",
          target_id: violatingPost.id,
          reason: "This post contains spam and violates community guidelines.",
        },
      },
    );
  typia.assert(report);
  // Verify initial report status is pending
  TestValidator.equals("initial report status", report.status, "pending");
  // 4. Member A (as moderator) approves the report
  const updatedReport =
    await api.functional.redditClone.member.communities.reports.update(
      memberAConnection,
      {
        communityId: community.id,
        reportId: report.id,
        body: {
          status: "approved",
          resolution_note:
            "Report approved. Post violates community guidelines.",
        } satisfies IRedditCloneCommunityReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 5. Validate the approved report
  TestValidator.equals(
    "report status is approved",
    updatedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "resolved_by_id is populated",
    updatedReport.reporter !== null && updatedReport.reporter !== undefined,
  );
  TestValidator.predicate(
    "resolved_at timestamp is set",
    updatedReport.updated_at !== null && updatedReport.updated_at !== undefined,
  );
  TestValidator.equals(
    "reporter ID matches Member C",
    updatedReport.reporter.id,
    memberCAuthorized.id,
  );
  TestValidator.equals(
    "community ID matches",
    updatedReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "target type is post",
    updatedReport.target_type,
    "post",
  );
  TestValidator.equals(
    "target ID matches the violating post",
    updatedReport.target_id,
    violatingPost.id,
  );
}
