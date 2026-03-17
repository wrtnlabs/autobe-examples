import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_report_review_list_for_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator matches authorized member",
    community.member.id,
    authorized.id,
  );
  const request = {
    communityId: community.id,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformReport.IRequest;
  const firstPage =
    await api.functional.communityPlatform.member.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: request,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "requested page is reflected in pagination",
    firstPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit is reflected in pagination",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "data length does not exceed pagination limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "records are not less than current page data length",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "zero records imply zero pages",
    firstPage.pagination.records !== 0 || firstPage.pagination.pages === 0,
  );
  TestValidator.predicate(
    "non-zero records imply at least one page",
    firstPage.pagination.records === 0 || firstPage.pagination.pages >= 1,
  );
  for (const report of firstPage.data) {
    TestValidator.equals(
      "report belongs to requested community",
      report.community.id,
      community.id,
    );
  }
  const firstSnapshot = new Map(
    firstPage.data.map((report) => [
      report.id,
      {
        id: report.id,
        status: report.status,
        resolution: report.resolution,
        updated_at: report.updated_at,
        communityId: report.community.id,
      },
    ]),
  );
  const secondPage =
    await api.functional.communityPlatform.member.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: request,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second read preserves current page",
    secondPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "second read preserves page limit",
    secondPage.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "second read preserves record count",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  for (const report of secondPage.data) {
    TestValidator.equals(
      "second read report belongs to requested community",
      report.community.id,
      community.id,
    );
    const snapshot = firstSnapshot.get(report.id);
    if (snapshot !== undefined) {
      TestValidator.equals(
        "report status is unchanged while browsing",
        report.status,
        snapshot.status,
      );
      TestValidator.equals(
        "report resolution is unchanged while browsing",
        report.resolution,
        snapshot.resolution,
      );
      TestValidator.equals(
        "report updated_at is unchanged while browsing",
        report.updated_at,
        snapshot.updated_at,
      );
      TestValidator.equals(
        "report community remains unchanged while browsing",
        report.community.id,
        snapshot.communityId,
      );
    }
  }
}
