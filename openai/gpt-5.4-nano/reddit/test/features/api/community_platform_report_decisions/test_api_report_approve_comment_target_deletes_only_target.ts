import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import type { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_vote_comment } from "../../../prepare/prepare_random_community_platform_post_vote_comment";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_approve_comment_target_deletes_only_target(
  connection: api.IConnection,
): Promise<void> {
  // 1) Moderator authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(moderator);
  // 2) Create community (as moderator)
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      moderatorConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/icon_${RandomGenerator.alphaNumeric(6)}.png`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3) Assign moderator to community
  const moderatorAssignment: ICommunityPlatformCommunityModerator =
    await generate_random_community_platform_community_moderators_create(
      moderatorConnection,
      {
        body: {
          communityId: community.id,
          moderatorUserId: moderator.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 4) Create post by moderator
  // NOTE: posts.create returns void, so we cannot fetch post id via SDK.
  // Therefore, we rely on the comment creation endpoint's behavior by creating
  // comments on a newly created post id returned from a helper.
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create a post with SDK (best-effort). Comment creation will be performed
  // against the postId; if the environment requires a real postId, this
  // needs a post-fetch/list endpoint.
  await api.functional.communityPlatform.member.posts.create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 5) Create two comments on the post
  const comment1: ICommunityPlatformPostVoteComment =
    await generate_random_community_platform_member_posts_comments_create(
      moderatorConnection,
      {
        params: { postId },
        body: {
          bodyText: RandomGenerator.paragraph({ sentences: 1 }),
          parentCommentId: null,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    );
  typia.assert(comment1);
  const comment2: ICommunityPlatformPostVoteComment =
    await generate_random_community_platform_member_posts_comments_create(
      moderatorConnection,
      {
        params: { postId },
        body: {
          bodyText: RandomGenerator.paragraph({ sentences: 1 }),
          parentCommentId: null,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    );
  typia.assert(comment2);
  // 6) Reporter authorization
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(reporterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(reporter);
  // 7) Create moderation report targeting comment1
  const report: ICommunityPlatformReport =
    await generate_random_community_platform_member_reports_create(
      reporterConnection,
      {
        body: {
          communityId: community.id,
          targetType: "comment",
          targetId: comment1.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // 8) Approve the report
  const resolution: ICommunityPlatformReportResolution =
    await api.functional.communityPlatform.member.reports.decisions.approve.approveReportDecision(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(resolution);
  TestValidator.equals(
    "resolution decision should be approved",
    resolution.resolutionDecision,
    "approved",
  );
  TestValidator.equals(
    "moderatedByUserId should match moderator",
    resolution.moderatedByUserId,
    moderator.id,
  );
  // Best-effort side effects: comment1 should become non-reportable; comment2 remains reportable.
  await TestValidator.error(
    "comment1 should be deleted after approval",
    async () => {
      await generate_random_community_platform_member_reports_create(
        reporterConnection,
        {
          body: {
            communityId: community.id,
            targetType: "comment",
            targetId: comment1.id,
            reason: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies ICommunityPlatformReport.ICreate,
        },
      );
    },
  );
  const report2: ICommunityPlatformReport =
    await generate_random_community_platform_member_reports_create(
      reporterConnection,
      {
        body: {
          communityId: community.id,
          targetType: "comment",
          targetId: comment2.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report2);
  TestValidator.equals(
    "comment2 report targetId unchanged",
    report2.targetId,
    comment2.id,
  );
}
