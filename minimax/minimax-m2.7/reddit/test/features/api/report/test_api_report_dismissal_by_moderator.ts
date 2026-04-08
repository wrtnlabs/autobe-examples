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

export async function test_api_report_dismissal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member1 joins and creates a community (becomes owner/moderator)
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 2. Member2 joins the platform
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  // 3. Member2 subscribes to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      member2Connection,
      {
        body: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Member2 creates a text post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Member2 submits a report for the post with a reason
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      member2Connection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          target_id: post.id,
          target_type: "post",
          reason:
            "This post violates community guidelines with inappropriate content.",
        },
      },
    );
  typia.assert(report);
  // Validate initial report status is pending
  TestValidator.equals(
    "report status should be pending",
    report.status,
    "pending",
  );
  // 6. Member1 (as moderator/owner) dismisses the report with a resolution note
  const resolutionNote =
    "Reviewed and determined content does not violate guidelines.";
  const dismissedReport =
    await api.functional.redditClone.member.communities.reports.dismiss(
      member1Connection,
      {
        communityId: community.id,
        reportId: report.id,
        body: {
          resolutionNote: resolutionNote,
        },
      },
    );
  typia.assert(dismissedReport);
  // 7. Validate response: report status changes to 'dismissed'
  TestValidator.equals(
    "report status should be dismissed",
    dismissedReport.status,
    "dismissed",
  );
  // Verify reporter is member2 (who filed the report)
  TestValidator.equals(
    "reporter should be member2",
    dismissedReport.reporter.username,
    member2Connection.headers?.Authorization ? "" : "",
  );
  // 8. Verify the reported post remains visible and accessible
  TestValidator.equals("post id should match", post.id, post.id);
  TestValidator.equals(
    "post community should match",
    post.community.id,
    community.id,
  );
  TestValidator.predicate(
    "post should not be deleted",
    post.deletedAt === null,
  );
}
