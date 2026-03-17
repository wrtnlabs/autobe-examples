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

export async function test_api_report_review_list_isolated_to_requested_community(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const targetCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `target-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(targetCommunity);
  const otherCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `other-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(otherCommunity);
  const requestedPage = 1 satisfies number as number;
  const requestedLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;
  const requestBody = {
    communityId: targetCommunity.id,
    page: requestedPage,
    limit: requestedLimit,
  } satisfies ICommunityPlatformReport.IRequest;
  const page =
    await api.functional.communityPlatform.member.communities.reports.index(
      memberConnection,
      {
        communityId: targetCommunity.id,
        body: requestBody,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "requested page is reflected in pagination",
    page.pagination.current,
    requestedPage,
  );
  TestValidator.equals(
    "requested limit is reflected in pagination",
    page.pagination.limit,
    requestedLimit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    page.pagination.pages >= 0,
  );
  for (const report of page.data) {
    TestValidator.equals(
      "top-level report community matches requested path community",
      report.community.id,
      targetCommunity.id,
    );
    TestValidator.equals(
      "joined community summary matches request body community",
      report.community.id,
      requestBody.communityId,
    );
    TestValidator.notEquals(
      "report community does not leak other community",
      report.community.id,
      otherCommunity.id,
    );
  }
}
