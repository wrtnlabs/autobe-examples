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

export async function test_api_report_review_rejects_cross_community_moderation(
  connection: api.IConnection,
): Promise<void> {
  const communityAModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  const communityAModeratorAuth = await authorize_member_join(
    communityAModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(communityAModeratorAuth);
  const communityA =
    await generate_random_community_platform_member_communities_create(
      communityAModeratorConnection,
      {
        body: {
          slug: `community-a-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  const communityBOwnerConnection: api.IConnection = {
    host: connection.host,
  };
  const communityBOwnerAuth = await authorize_member_join(
    communityBOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(communityBOwnerAuth);
  const communityB =
    await generate_random_community_platform_member_communities_create(
      communityBOwnerConnection,
      {
        body: {
          slug: `community-b-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  const postInCommunityB =
    await generate_random_community_platform_member_posts_create(
      communityBOwnerConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: communityB.id,
          post_type: "text",
          textContent: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(postInCommunityB);
  const reportInCommunityB =
    await generate_random_community_platform_member_reports_create(
      communityBOwnerConnection,
      {
        body: {
          targetType: "post",
          targetId: postInCommunityB.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          detail: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(reportInCommunityB);
  TestValidator.equals(
    "report belongs to community B",
    reportInCommunityB.community.id,
    communityB.id,
  );
  TestValidator.equals(
    "reported post belongs to community B",
    reportInCommunityB.reportedPost?.community.id,
    communityB.id,
  );
  await TestValidator.error(
    "cross-community moderation attempt is rejected",
    async () => {
      await generate_random_community_platform_member_communities_reports_reviews_create(
        communityAModeratorConnection,
        {
          params: {
            communityId: communityA.id,
            reportId: reportInCommunityB.id,
          },
          body: {
            review_action: "dismissed",
            note: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformReportReview.ICreate,
        },
      );
    },
  );
  const validReview =
    await generate_random_community_platform_member_communities_reports_reviews_create(
      communityBOwnerConnection,
      {
        params: {
          communityId: communityB.id,
          reportId: reportInCommunityB.id,
        },
        body: {
          review_action: "dismissed",
          note: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformReportReview.ICreate,
      },
    );
  typia.assert(validReview);
  TestValidator.equals(
    "valid review references original report",
    validReview.report.id,
    reportInCommunityB.id,
  );
  TestValidator.equals(
    "valid review moderator belongs to community B",
    validReview.moderator.community.id,
    communityB.id,
  );
  TestValidator.notEquals(
    "cross-community moderator community differs from rightful community",
    communityA.id,
    communityB.id,
  );
}
