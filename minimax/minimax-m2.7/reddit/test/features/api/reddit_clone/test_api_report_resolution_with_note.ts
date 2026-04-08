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

export async function test_api_report_resolution_with_note(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers - will become community owner/moderator
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  // 3. Member B registers - will be the post author
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 4. Member B subscribes to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 5. Member B creates a text post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: "Test post for reporting",
        body: "This post will be reported by another member.",
      },
    },
  );
  // 6. Member C registers - will be the reporter
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  // 7. Member C subscribes to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberCConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 8. Member C files a report against the post
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      memberCConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          target_id: post.id,
          target_type: "post",
          reason: "This content violates community guidelines about spam.",
        },
      },
    );
  // 9. Member A (as community moderator) updates the report with dismissed status and resolution note
  const resolutionNote =
    "Content reviewed and found to be within acceptable community standards. No violation detected.";
  const updatedReport =
    await api.functional.redditClone.member.communities.reports.update(
      memberAConnection,
      {
        communityId: community.id,
        reportId: report.id,
        body: {
          status: "dismissed",
          resolution_note: resolutionNote,
        },
      },
    );
  typia.assert(updatedReport);
  // Validation
  TestValidator.equals(
    "report status is dismissed",
    updatedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "target_type is post",
    updatedReport.target_type,
    "post",
  );
  TestValidator.equals(
    "target_id matches post",
    updatedReport.target_id,
    post.id,
  );
  TestValidator.equals(
    "reporter is member C",
    updatedReport.reporter.id,
    memberC.id,
  );
  TestValidator.equals(
    "community matches",
    updatedReport.community.id,
    community.id,
  );
}