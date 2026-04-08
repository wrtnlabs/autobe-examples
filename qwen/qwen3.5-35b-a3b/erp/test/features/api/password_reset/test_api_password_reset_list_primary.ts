import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_list_primary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member with admin role
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        avatar_uri: typia.random<string & tags.Format<"uri">>(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph(),
        org_logo_uri: typia.random<string & tags.Format<"uri">>(),
        org_timezone: RandomGenerator.pick([
          "UTC",
          "Asia/Seoul",
          "America/New_York",
        ]),
        org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create a few password reset tokens for testing
  const testTokens: IHrmPlatformMemberPasswordReset.ISummary[] =
    ArrayUtil.repeat(
      15,
      () =>
        ({
          id: typia.random<string & tags.Format<"uuid">>(),
          member: admin.member,
          status: "active",
          created_at: new Date(
            Date.now() - Math.random() * 86400000,
          ).toISOString(),
          expired_at: new Date(
            Date.now() + Math.random() * 3600000,
          ).toISOString(),
          deleted_at: null,
        }) satisfies IHrmPlatformMemberPasswordReset.ISummary,
    );
  // 3. Call the password reset token list endpoint
  const response: IPageIHrmPlatformMemberPasswordReset.ISummary =
    await api.functional.hrmPlatform.member.password_resets.index(
      adminConnection,
      {
        body: {} satisfies IHrmPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  typia.assert(response.data);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    response.pagination.records,
    testTokens.length,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 100);
  TestValidator.equals(
    "pagination pages",
    Math.ceil(response.pagination.records / response.pagination.limit),
    response.pagination.pages,
  );
  // 5. Validate token fields and member joins
  for (const token of response.data) {
    typia.assert(token);
    typia.assert(token.member);
    TestValidator.equals(
      "token has valid id",
      typia.is<string & tags.Format<"uuid">>(token.id),
      true,
    );
    TestValidator.equals("token has valid status", token.status !== null, true);
    TestValidator.equals(
      "token has valid created_at",
      token.created_at !== null,
      true,
    );
    TestValidator.equals(
      "token has valid expired_at",
      token.expired_at !== null,
      true,
    );
    // Validate member join fields
    TestValidator.equals("member has id", token.member.id !== null, true);
    TestValidator.equals("member has email", token.member.email !== null, true);
    TestValidator.equals(
      "member has is_active",
      token.member.is_active !== null,
      true,
    );
  }
  // 6. Test cursor-based pagination
  if (response.pagination.pages > 1) {
    const nextPage: IPageIHrmPlatformMemberPasswordReset.ISummary =
      await api.functional.hrmPlatform.member.password_resets.index(
        adminConnection,
        {
          body: {
            limit: 50,
            page: 2,
          } satisfies IHrmPlatformMemberPasswordReset.IRequest,
        },
      );
    typia.assert(nextPage);
    TestValidator.equals("next page current", nextPage.pagination.current, 2);
  }
  // 7. Verify sorting order (created_at DESC by default)
  if (response.data.length > 1) {
    let isSorted = true;
    for (let i = 1; i < response.data.length; i++) {
      const prev = new Date(response.data[i - 1].created_at);
      const curr = new Date(response.data[i].created_at);
      if (prev < curr) {
        isSorted = false;
        break;
      }
    }
    TestValidator.predicate("tokens sorted by created_at DESC", isSorted);
  }
}