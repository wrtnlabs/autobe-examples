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
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_report_review_list_for_moderated_community(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        },
      },
    );
  typia.assert(community);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderatorAuth);
  const moderatorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communitySlug: community.slug,
        },
        body: {
          member_code: moderatorAuth.code,
        },
      },
    );
  typia.assert(moderatorAssignment);
  const moderatorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      moderatorConnection,
      {
        body: {
          community_slug: community.slug,
        },
      },
    );
  typia.assert(moderatorSubscription);
  const post = await generate_random_community_platform_member_posts_create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
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
  const reporterSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      reporterConnection,
      {
        body: {
          community_slug: community.slug,
        },
      },
    );
  typia.assert(reporterSubscription);
  const reason = RandomGenerator.paragraph({ sentences: 4 });
  const detail = RandomGenerator.content({ paragraphs: 2 });
  const createdReport =
    await generate_random_community_platform_member_reports_create(
      reporterConnection,
      {
        body: {
          targetType: "post",
          targetId: post.id,
          reason,
          detail,
        },
      },
    );
  typia.assert(createdReport);
  const requestBody = {
    communityId: community.id,
    status: createdReport.status,
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies ICommunityPlatformReport.IRequest;
  const firstPage = await api.functional.communityPlatform.member.reports.index(
    moderatorConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "first page current matches request",
    firstPage.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "first page limit matches request",
    firstPage.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "first page records cover returned data length",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "first page pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages are present when records exist",
    firstPage.pagination.records === 0 || firstPage.pagination.pages >= 1,
  );
  TestValidator.equals(
    "second page current matches request",
    secondPage.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "second page limit matches request",
    secondPage.pagination.limit,
    requestBody.limit,
  );
  const foundFirst = firstPage.data.find(
    (report) => report.id === createdReport.id,
  );
  const foundSecond = secondPage.data.find(
    (report) => report.id === createdReport.id,
  );
  TestValidator.predicate(
    "created report is included in first moderator queue page",
    foundFirst !== undefined,
  );
  TestValidator.predicate(
    "created report is included in second moderator queue page",
    foundSecond !== undefined,
  );
  const firstReport = typia.assert(foundFirst!);
  const secondReport = typia.assert(foundSecond!);
  TestValidator.equals(
    "created report id matches first page item",
    firstReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "created report reason matches first page item",
    firstReport.reason,
    reason,
  );
  TestValidator.equals(
    "created report detail matches first page item",
    firstReport.detail,
    detail,
  );
  TestValidator.equals(
    "created report status remains unchanged on first read",
    firstReport.status,
    createdReport.status,
  );
  TestValidator.equals(
    "created report community matches scoped community on first read",
    firstReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "created report reporter matches reporting member on first read",
    firstReport.member.id,
    reporterAuth.id,
  );
  TestValidator.equals(
    "created report id matches second page item",
    secondReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "created report reason matches second page item",
    secondReport.reason,
    reason,
  );
  TestValidator.equals(
    "created report detail matches second page item",
    secondReport.detail,
    detail,
  );
  TestValidator.equals(
    "created report status remains unchanged on second read",
    secondReport.status,
    createdReport.status,
  );
  TestValidator.equals(
    "created report community matches scoped community on second read",
    secondReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "created report reporter matches reporting member on second read",
    secondReport.member.id,
    reporterAuth.id,
  );
  for (const report of firstPage.data) {
    TestValidator.equals(
      "every first page report belongs to the moderated community",
      report.community.id,
      community.id,
    );
    TestValidator.equals(
      "every first page report matches requested status",
      report.status,
      createdReport.status,
    );
  }
  for (const report of secondPage.data) {
    TestValidator.equals(
      "every second page report belongs to the moderated community",
      report.community.id,
      community.id,
    );
    TestValidator.equals(
      "every second page report matches requested status",
      report.status,
      createdReport.status,
    );
  }
  TestValidator.equals(
    "read-only listing preserves created report status across repeated reads",
    firstReport.status,
    secondReport.status,
  );
}
