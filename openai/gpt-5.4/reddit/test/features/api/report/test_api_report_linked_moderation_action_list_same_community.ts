import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_linked_moderation_action_list_same_community(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const body = {
    status: RandomGenerator.paragraph({ sentences: 2 }),
    resolution: RandomGenerator.pick([
      null,
      RandomGenerator.paragraph({ sentences: 2 }),
    ] as const),
    search: RandomGenerator.paragraph({ sentences: 3 }),
    sort: RandomGenerator.pick(["+created_at", "-created_at"] as const),
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies ICommunityPlatformReport.IRequest;
  const output =
    await api.functional.communityPlatform.admin.communities.moderationActions.reports.index(
      adminConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        moderationActionId: typia.random<string & tags.Format<"uuid">>(),
        body,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current is non-negative",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length does not exceed requested limit",
    output.data.length <= body.limit,
  );
  TestValidator.predicate(
    "page data length does not exceed pagination limit",
    output.data.length <= output.pagination.limit,
  );
}
