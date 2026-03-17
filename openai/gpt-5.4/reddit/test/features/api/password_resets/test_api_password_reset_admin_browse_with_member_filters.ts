import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_password_reset_admin_browse_with_member_filters(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  const request = {
    member_email:
      `no-match-${RandomGenerator.alphaNumeric(12)}@example.com` satisfies string as string &
        tags.Format<"email">,
    member_code: `NO_MATCH_${RandomGenerator.alphaNumeric(12)}`,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformMemberPasswordReset.IRequest;
  const firstPage =
    await api.functional.communityPlatform.admin.password_resets.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "empty browse current page matches request",
    firstPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "empty browse page limit matches request",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "empty browse returns no rows",
    firstPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty browse records count is zero",
    firstPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty browse pages count is zero",
    firstPage.pagination.pages,
    0,
  );
  const secondPage =
    await api.functional.communityPlatform.admin.password_resets.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "repeated empty browse keeps pagination stable",
    secondPage.pagination,
    firstPage.pagination,
  );
  TestValidator.equals(
    "repeated empty browse keeps data stable",
    secondPage.data,
    firstPage.data,
  );
}
