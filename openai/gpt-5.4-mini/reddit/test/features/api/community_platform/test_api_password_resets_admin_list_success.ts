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

export async function test_api_password_resets_admin_list_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>() as string &
        tags.MinLength<1> &
        tags.Format<"password">,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const output =
    await api.functional.communityPlatform.admin.password_resets.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
          createdAtTo: new Date().toISOString(),
        } satisfies ICommunityPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page is positive",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit >= 1,
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
    "summary rows are returned as an array",
    Array.isArray(output.data),
  );
  if (output.data.length >= 2) {
    for (let i = 1; i < output.data.length; ++i) {
      TestValidator.predicate(
        "rows are ordered by most recent creation time first",
        output.data[i - 1].created_at >= output.data[i].created_at,
      );
    }
  }
}
