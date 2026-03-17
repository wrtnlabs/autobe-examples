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

export async function test_api_email_verification_history_filtered_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminTest1234!",
      href: "https://example.com/admin/onboarding",
      referrer: "https://example.com/admin",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authorized);
  const from = new Date("2099-01-01T00:00:00.000Z").toISOString();
  const to = new Date("2099-12-31T23:59:59.999Z").toISOString();
  const request = {
    createdAtFrom: from,
    createdAtTo: to,
    verifiedAtFrom: from,
    verifiedAtTo: to,
    invalidatedAtIsNull: true,
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies ICommunityPlatformMemberEmailVerification.IRequest;
  const firstPage =
    await api.functional.communityPlatform.admin.email_verifications.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.communityPlatform.admin.email_verifications.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "requested current page is preserved",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested page limit is preserved",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty result has no records in data",
    firstPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty result total records",
    firstPage.pagination.records,
    0,
  );
  TestValidator.predicate(
    "empty result pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "repeated empty request returns same data",
    secondPage.data,
    firstPage.data,
  );
  TestValidator.equals(
    "repeated empty request returns same pagination",
    secondPage.pagination,
    firstPage.pagination,
  );
}
