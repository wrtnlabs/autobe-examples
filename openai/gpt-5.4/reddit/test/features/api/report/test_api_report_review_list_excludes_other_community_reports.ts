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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_review_list_excludes_other_community_reports(
  connection: api.IConnection,
): Promise<void> {
  const ownerAConnection: api.IConnection = { host: connection.host };
  const ownerAAuth = await authorize_member_join(ownerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAAuth);
  const reviewerConnection: api.IConnection = { host: connection.host };
  const reviewerAuth = await authorize_member_join(reviewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(reviewerAuth);
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(reporterAuth);
  const ownerBConnection: api.IConnection = { host: connection.host };
  const ownerBAuth = await authorize_member_join(ownerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerBAuth);
  const communityABody = {
    slug: `community-a-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityA =
    await generate_random_community_platform_member_communities_create(
      ownerAConnection,
      {
        body: communityABody,
      },
    );
  typia.assert(communityA);
  const moderatorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerAConnection,
      {
        params: {
          communitySlug: communityA.slug,
        },
        body: {
          member_code: reviewerAuth.code,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "reviewer assigned to community A",
    moderatorAssignment.community.id,
    communityA.id,
  );
  TestValidator.equals(
    "moderator assignment targets reviewer",
    moderatorAssignment.member.id,
    reviewerAuth.id,
  );
  const communityBBody = {
    slug: `community-b-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const communityB =
    await generate_random_community_platform_member_communities_create(
      ownerBConnection,
      {
        body: communityBBody,
      },
    );
  typia.assert(communityB);
  const postABody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    community_platform_community_id: communityA.id,
    post_type: "text",
    textContent: {
      body: RandomGenerator.content({ paragraphs: 2 }),
    },
  } satisfies ICommunityPlatformPost.ICreate;
  const postA = await generate_random_community_platform_member_posts_create(
    reporterConnection,
    {
      body: postABody,
    },
  );
  typia.assert(postA);
  const postBBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    community_platform_community_id: communityB.id,
    post_type: "text",
    textContent: {
      body: RandomGenerator.content({ paragraphs: 2 }),
    },
  } satisfies ICommunityPlatformPost.ICreate;
  const postB = await generate_random_community_platform_member_posts_create(
    reporterConnection,
    {
      body: postBBody,
    },
  );
  typia.assert(postB);
  const reportABody = {
    targetType: "post",
    targetId: postA.id,
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    detail: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const reportA =
    await generate_random_community_platform_member_reports_create(
      reporterConnection,
      {
        body: reportABody,
      },
    );
  typia.assert(reportA);
  const reportBBody = {
    targetType: "post",
    targetId: postB.id,
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    detail: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const reportB =
    await generate_random_community_platform_member_reports_create(
      reporterConnection,
      {
        body: reportBBody,
      },
    );
  typia.assert(reportB);
  const requestBody = {
    communityId: communityA.id,
    status: reportA.status,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformReport.IRequest;
  const page = await api.functional.communityPlatform.member.reports.index(
    reviewerConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "requested page preserved",
    page.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "requested limit preserved",
    page.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    page.pagination.pages >= 0,
  );
  const reportIds = page.data.map((report) => report.id);
  TestValidator.predicate(
    "community A report is present",
    reportIds.includes(reportA.id),
  );
  TestValidator.predicate(
    "community B report is excluded",
    reportIds.includes(reportB.id) === false,
  );
  for (const summary of page.data) {
    TestValidator.equals(
      "every returned report belongs to community A",
      summary.community.id,
      communityA.id,
    );
    TestValidator.equals(
      "every returned report uses requested community slug",
      summary.community.slug,
      communityA.slug,
    );
    TestValidator.equals(
      "every returned report uses requested community title",
      summary.community.title,
      communityA.title,
    );
  }
  const matchingSummary = page.data.find((report) => report.id === reportA.id);
  TestValidator.predicate(
    "matching community A report summary exists",
    matchingSummary !== undefined,
  );
  if (matchingSummary !== undefined) {
    TestValidator.equals(
      "matching report reason preserved",
      matchingSummary.reason,
      reportA.reason,
    );
    TestValidator.equals(
      "matching report detail preserved",
      matchingSummary.detail,
      reportA.detail,
    );
    TestValidator.equals(
      "matching report reporter preserved",
      matchingSummary.member.id,
      reportA.reporter.id,
    );
    TestValidator.equals(
      "matching report status preserved",
      matchingSummary.status,
      reportA.status,
    );
    TestValidator.equals(
      "matching report community context preserved",
      matchingSummary.community.id,
      reportA.community.id,
    );
  }
}
