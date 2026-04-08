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

export async function test_api_password_reset_list_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test active status filter
  const activePage =
    await api.functional.hrmPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "active" as const,
          limit: 10,
        } satisfies IHrmPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(activePage);
  // Validate active filter returns only active tokens
  for (const token of activePage.data) {
    TestValidator.equals("active filter - status", token.status, "active");
  }
  // 3. Test used status filter
  const usedPage =
    await api.functional.hrmPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "used" as const,
          limit: 10,
        } satisfies IHrmPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(usedPage);
  // Validate used filter returns only used tokens
  for (const token of usedPage.data) {
    TestValidator.equals("used filter - status", token.status, "used");
  }
  // 4. Test expired status filter
  const expiredPage =
    await api.functional.hrmPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {
          status: "expired" as const,
          limit: 10,
        } satisfies IHrmPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(expiredPage);
  // Validate expired filter returns only expired tokens
  for (const token of expiredPage.data) {
    TestValidator.equals("expired filter - status", token.status, "expired");
  }
  // 5. Validate pagination metadata for each filter
  TestValidator.predicate(
    "active page - pagination valid",
    activePage.pagination.records >= 0 &&
      activePage.pagination.pages >= 0 &&
      activePage.pagination.current >= 1 &&
      activePage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "used page - pagination valid",
    usedPage.pagination.records >= 0 &&
      usedPage.pagination.pages >= 0 &&
      usedPage.pagination.current >= 1 &&
      usedPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "expired page - pagination valid",
    expiredPage.pagination.records >= 0 &&
      expiredPage.pagination.pages >= 0 &&
      expiredPage.pagination.current >= 1 &&
      expiredPage.pagination.limit > 0,
  );
  // 6. Verify pagination accuracy - limit should match max data length
  TestValidator.predicate(
    "active page - data within limit",
    activePage.data.length <= activePage.pagination.limit,
  );
  TestValidator.predicate(
    "used page - data within limit",
    usedPage.data.length <= usedPage.pagination.limit,
  );
  TestValidator.predicate(
    "expired page - data within limit",
    expiredPage.data.length <= expiredPage.pagination.limit,
  );
  // 7. Verify all returned tokens match their filter criteria
  const allTokens = [...activePage.data, ...usedPage.data, ...expiredPage.data];
  TestValidator.predicate(
    "all tokens have valid status",
    allTokens.every(
      (token) =>
        token.status === "active" ||
        token.status === "used" ||
        token.status === "expired",
    ),
  );
}
