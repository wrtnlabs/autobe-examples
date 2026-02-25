import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_dismiss_by_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin account
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const password1 = RandomGenerator.alphaNumeric(16);
  const platformAdmin: IRedditCommunityPlatformAdmin.IAuthorized =
    await authorize_platform_admin_join(platformAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: password1,
        username: RandomGenerator.name(1),
      },
    });
  typia.assert(platformAdmin);
  // 2. Create community moderator account
  const communityModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  const password2 = RandomGenerator.alphaNumeric(16);
  const communityModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await authorize_community_moderator_join(communityModeratorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: password2,
        username: RandomGenerator.name(1),
      },
    });
  typia.assert(communityModerator);
  // 3. Create member account and post content
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      },
    });
  typia.assert(member);
  // Member needs to be subscribed to a community to post
  // The community is automatically assigned to the community moderator upon join
  const communityId = communityModerator.community.id;
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: communityId,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Submit a report on the post by the member
  const report = await api.functional.redditCommunity.member.reports.create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: post.id,
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "report status should be pending",
    report.status,
    "pending",
  );
  TestValidator.equals(
    "report should be from member",
    report.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "report target should be the post",
    report.target.id,
    post.id,
  );
  // 5. Dismiss the report using community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorLogin: IRedditCommunityCommunityModerator.IAuthorized =
    await authorize_community_moderator_login(moderatorConnection, {
      body: {
        email: communityModerator.email,
        password: password2,
      },
    });
  typia.assert(moderatorLogin);
  const dismissedReport =
    await api.functional.redditCommunity.platformAdmin.admin.reports.dismiss(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(dismissedReport);
  // Validate dismissal results
  TestValidator.equals(
    "report status should be dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "resolved_by_user should be moderator",
    dismissedReport.resolved_by_user?.id,
    communityModerator.id,
  );
  TestValidator.predicate(
    "resolved_by_user not null",
    () => dismissedReport.resolved_by_user !== undefined,
  );
  TestValidator.equals(
    "report target unchanged",
    dismissedReport.target.id,
    post.id,
  );
}
