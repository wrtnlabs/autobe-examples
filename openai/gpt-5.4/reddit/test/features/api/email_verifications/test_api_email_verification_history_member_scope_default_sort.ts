import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_email_verification_history_member_scope_default_sort(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(joined);
  const request = {
    page: 1,
    limit: 100,
  } satisfies ICommunityPlatformMemberEmailVerification.IRequest;
  const page =
    await api.functional.communityPlatform.admin.email_verifications.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "requested page is reflected in pagination.current",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit is reflected in pagination.limit",
    page.pagination.limit,
    request.limit,
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
    "data length does not exceed limit",
    page.data.length <= page.pagination.limit,
  );
  for (let i = 1; i < page.data.length; ++i) {
    const previous = page.data[i - 1];
    const current = page.data[i];
    TestValidator.notEquals(
      "adjacent email verification summaries are distinct records",
      previous.id,
      current.id,
    );
    TestValidator.predicate(
      "default sort orders newest created_at first",
      new Date(previous.created_at).getTime() >=
        new Date(current.created_at).getTime(),
    );
  }
}
