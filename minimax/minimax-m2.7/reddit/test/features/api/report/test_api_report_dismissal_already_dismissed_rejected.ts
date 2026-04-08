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

export async function test_api_report_dismissal_already_dismissed_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member1 joins and creates a community (becomes owner/moderator)
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 2. Member2 joins, subscribes, creates a post, and files a report
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    { body: { communityId: community.id } },
  );
  const post = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(post);
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      member2Connection,
      {
        params: { communityId: community.id },
        body: {
          target_type: "post",
          target_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  // 3. Member1 (moderator) dismisses the report successfully
  const dismissedReport =
    await api.functional.redditClone.member.communities.reports.dismiss(
      member1Connection,
      {
        communityId: community.id,
        reportId: report.id,
        body: {},
      },
    );
  typia.assert(dismissedReport);
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  // 4. Member1 attempts to dismiss the same report again
  // 5. Validate: returns 400 Bad Request indicating the report has already been processed/dismissed
  await TestValidator.httpError(
    "cannot dismiss already dismissed report",
    400,
    async () => {
      await api.functional.redditClone.member.communities.reports.dismiss(
        member1Connection,
        {
          communityId: community.id,
          reportId: report.id,
          body: {},
        },
      );
    },
  );
}
