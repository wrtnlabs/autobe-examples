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

export async function test_api_report_linked_moderation_action_list_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const request = {
    communityId: typia.random<string & tags.Format<"uuid">>(),
    status: RandomGenerator.paragraph({ sentences: 2 }),
    resolution: null,
    search: RandomGenerator.paragraph({ sentences: 2 }),
    sort: "-created_at",
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies ICommunityPlatformReport.IRequest;
  const page =
    await api.functional.communityPlatform.member.communities.moderationActions.reports.index(
      memberConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        moderationActionId: typia.random<string & tags.Format<"uuid">>(),
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current is non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length does not exceed limit when limit is positive",
    page.pagination.limit === 0 || page.data.length <= page.pagination.limit,
  );
  for (const report of page.data) {
    TestValidator.predicate(
      "report reason is not empty",
      report.reason.length > 0,
    );
    TestValidator.predicate(
      "report detail is nullable string",
      report.detail === null || report.detail.length >= 0,
    );
    TestValidator.predicate(
      "report resolution is nullable string",
      report.resolution === null || report.resolution.length >= 0,
    );
  }
}
