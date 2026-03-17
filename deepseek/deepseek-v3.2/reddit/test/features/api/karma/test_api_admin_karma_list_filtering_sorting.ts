import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarma";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarma";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_karma_list_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // adminConnection.headers is now updated internally with authorization token
  // 2. Test basic pagination with default parameters
  const defaultParams: ICommunityPlatformKarma.IRequest = {};
  const defaultPage = await api.functional.communityPlatform.admin.karmas.index(
    adminConnection,
    { body: defaultParams },
  );
  typia.assert(defaultPage);
  // 3. Test pagination with explicit page and limit
  const paginatedParams: ICommunityPlatformKarma.IRequest = {
    page: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >() satisfies number as number,
  };
  const paginatedPage =
    await api.functional.communityPlatform.admin.karmas.index(adminConnection, {
      body: paginatedParams,
    });
  typia.assert(paginatedPage);
  // Validate pagination business logic
  TestValidator.equals(
    "page should match requested page",
    paginatedPage.pagination.current,
    paginatedParams.page!,
  );
  TestValidator.equals(
    "limit should match requested limit",
    paginatedPage.pagination.limit,
    paginatedParams.limit!,
  );
}
