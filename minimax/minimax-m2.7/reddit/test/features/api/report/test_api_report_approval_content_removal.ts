import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

export async function test_api_report_approval_content_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner (moderator) account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create content author account
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 3. Community owner creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  const communityName = community.name;
  // 4. Author subscribes to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditClonePostTextContent.ICreate,
    },
  );
  // 5. Author creates a post
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: communityName,
        type: "text" as const,
      },
    },
  );
  typia.assert(post);
  // 6. Community owner (moderator) casts a vote on the post
  const vote = await api.functional.redditClone.member.posts.votes.create(
    ownerConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(vote);
  // 7. Author submits a report against the post
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      authorConnection,
      {
        params: { communityName },
        body: {
          target_type: "post" as const,
          target_id: post.id,
          reason: "Violates community guidelines",
        },
      },
    );
  typia.assert(report);
  // Verify report is in pending status
  TestValidator.equals("report status is pending", report.status, "pending");
  // 8. Moderator approves the report
  const updatedReport =
    await api.functional.redditClone.member.communities.reports.update(
      ownerConnection,
      {
        communityName,
        reportId: report.id,
        body: {
          status: "approved" as const,
        } satisfies IRedditCloneReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 9. Verify report status is now approved
  TestValidator.equals(
    "report status is approved",
    updatedReport.status,
    "approved",
  );
  // 10. Verify the post is no longer accessible (soft-deleted)
  // Attempting to vote on a deleted post should fail
  await TestValidator.error(
    "post should not be accessible after report approval",
    async () => {
      await api.functional.redditClone.member.posts.votes.create(
        authorConnection,
        {
          postId: post.id,
        },
      );
    },
  );
}
