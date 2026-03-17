import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_ban_list_empty_when_no_active_bans(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
      ip: "127.0.0.1",
    },
  });
  typia.assert(admin);
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunityBan.IRequest;
  const page =
    await api.functional.communityPlatform.admin.communities.bans.index(
      adminConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: requestBody,
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
  if (page.data.length === 0) {
    TestValidator.equals("empty ban data", page.data.length, 0);
    TestValidator.equals(
      "empty result has zero records",
      page.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty result has zero pages",
      page.pagination.pages,
      0,
    );
  }
}
