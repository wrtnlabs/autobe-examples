import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_reports_reviews_create } from "../../../generate/generate_random_community_platform_member_communities_reports_reviews_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_report_review } from "../../../prepare/prepare_random_community_platform_report_review";

export async function test_api_report_review_approval_for_reported_post(
  connection: api.IConnection,
): Promise<void> {
  const moderatorConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(authorized);
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        },
      },
    );
  typia.assert(community);
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    community_platform_community_id: community.id,
    post_type: "text",
    textContent: {
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies ICommunityPlatformPostText.ICreate,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await generate_random_community_platform_member_posts_create(
      moderatorConnection,
      {
        body: postBody,
      },
    );
  typia.assert(post);
  const reportReason = RandomGenerator.paragraph({ sentences: 4 });
  const reportDetail = RandomGenerator.content({ paragraphs: 2 });
  const report: ICommunityPlatformReport =
    await generate_random_community_platform_member_reports_create(
      moderatorConnection,
      {
        body: {
          targetType: "post",
          targetId: post.id,
          reason: reportReason,
          detail: reportDetail,
        },
      },
    );
  typia.assert(report);
  TestValidator.equals(
    "report targets same community",
    report.community.id,
    community.id,
  );
  TestValidator.equals(
    "report reason matches input",
    report.reason,
    reportReason,
  );
  TestValidator.equals(
    "report detail matches input",
    report.detail,
    reportDetail,
  );
  TestValidator.predicate(
    "report includes reported post target",
    report.reportedPost !== null,
  );
  if (report.reportedPost === null) {
    throw new Error("Expected report.reportedPost to be non-null");
  }
  const reportedPost = report.reportedPost;
  TestValidator.equals(
    "reported post id matches created post",
    reportedPost.id,
    post.id,
  );
  TestValidator.equals(
    "reported post community matches created community",
    reportedPost.community.id,
    community.id,
  );
  const reviewNote = RandomGenerator.paragraph({ sentences: 5 });
  const review: ICommunityPlatformReportReview =
    await generate_random_community_platform_member_communities_reports_reviews_create(
      moderatorConnection,
      {
        params: {
          communityId: community.id,
          reportId: report.id,
        },
        body: {
          review_action: "approval",
          note: reviewNote,
        },
      },
    );
  typia.assert(review);
  TestValidator.equals(
    "review action persisted",
    review.review_action,
    "approval",
  );
  TestValidator.equals("review note persisted", review.note, reviewNote);
  TestValidator.equals(
    "review references same report",
    review.report.id,
    report.id,
  );
  TestValidator.equals(
    "review report reason preserved",
    review.report.reason,
    report.reason,
  );
  TestValidator.equals(
    "review report community preserved",
    review.report.community.id,
    community.id,
  );
  TestValidator.predicate(
    "approved report has resolution",
    review.report.resolution !== null,
  );
  TestValidator.equals(
    "moderator assignment community matches",
    review.moderator.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator assignment member matches actor",
    review.moderator.member.id,
    authorized.id,
  );
  TestValidator.predicate(
    "moderator assignment has non-empty status",
    review.moderator.status.length > 0,
  );
}
