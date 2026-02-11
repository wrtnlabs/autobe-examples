import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";
import { generate_random_reddit_community_community_owner_communities_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_report_approve_without_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform admin
  const platformAdminConnection: api.IConnection = { host: connection.host };
  await authorize_platform_admin_join(platformAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  // 2. Create a community owned by a community owner
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_community_owner_join(communityOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  const community =
    await api.functional.redditCommunity.communityOwner.communities.create(
      communityOwnerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a post in the community by a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.IJoin,
  });
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        communityName: community.name,
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Platform admin submits a report on the post
  const reportResponse =
    await api.functional.redditCommunity.platformAdmin.reports.index(
      platformAdminConnection,
      {
        body: {
          target_type: "post",
          comment_id: post.id, // Reusing comment_id field for post id as per DTO inconsistency
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          status: "pending",
          sortBy: "newest",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(reportResponse);
  // 5. Attempt to approve the report (should fail with 403 Forbidden)
  await TestValidator.httpError(
    "Platform admin without community rights cannot approve report",
    403,
    async () => {
      await api.functional.redditCommunity.platformAdmin.reports.approve(
        platformAdminConnection,
        {
          reportId: reportResponse.data[0].id,
        },
      );
    },
  );
}