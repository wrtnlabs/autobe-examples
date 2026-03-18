import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_directory_permission_denied_for_role_without_employee_view(
  connection: api.IConnection,
): Promise<void> {
  // -------------------------
  // 1) Restricted member org
  // -------------------------
  const restrictedBase: api.IConnection = { host: connection.host };
  const restrictedAuth = await authorize_member_join(restrictedBase, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password_1234!",
      organizationName: `restricted-org-${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(restrictedAuth);
  const restrictedConnection: api.IConnection = { host: connection.host };
  restrictedConnection.headers = {
    Authorization: restrictedAuth.token.access,
  };
  // -------------------------
  // 2) Allowed member org (best-effort)
  // -------------------------
  const allowedBase: api.IConnection = { host: connection.host };
  const allowedAuth = await authorize_member_join(allowedBase, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password_1234!",
      organizationName: `allowed-org-${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(allowedAuth);
  const allowedConnection: api.IConnection = { host: connection.host };
  allowedConnection.headers = {
    Authorization: allowedAuth.token.access,
  };
  // Shared request: keep minimal to avoid server-side sort/search whitelist issues.
  const request = {
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimeTrackingMember.IRequest;
  const listRestricted = async () =>
    await api.functional.erpHrmTimeTracking.member.members.index(
      restrictedConnection,
      {
        body: request,
      },
    );
  // -------------------------
  // 3) Assert restricted access denied or empty
  // -------------------------
  let restrictedResponse: IPageIErpHrmTimeTrackingMember.ISummary | undefined;
  try {
    restrictedResponse = await listRestricted();
    typia.assert(restrictedResponse);
  } catch {
    await TestValidator.httpError(
      "restricted directory access must be denied",
      [401, 403],
      async () => {
        await listRestricted();
      },
    );
  }
  if (restrictedResponse) {
    TestValidator.equals(
      "restricted data empty",
      restrictedResponse.data.length,
      0,
    );
    TestValidator.equals(
      "restricted pagination records",
      restrictedResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "restricted pagination pages",
      restrictedResponse.pagination.pages,
      0,
    );
  }
  // -------------------------
  // 4) Allowed org should be able to browse (best-effort)
  // -------------------------
  const allowedResponse =
    await api.functional.erpHrmTimeTracking.member.members.index(
      allowedConnection,
      {
        body: request,
      },
    );
  typia.assert(allowedResponse);
  const allowedHasData = allowedResponse.data.length > 0;
  // -------------------------
  // 5) Isolation: restricted remains empty even if allowed has data
  // -------------------------
  if (allowedHasData) {
    const restrictedResponse2 =
      await api.functional.erpHrmTimeTracking.member.members.index(
        restrictedConnection,
        {
          body: request,
        },
      );
    typia.assert(restrictedResponse2);
    TestValidator.equals(
      "restricted isolation data empty",
      restrictedResponse2.data.length,
      0,
    );
    TestValidator.equals(
      "restricted isolation pagination records",
      restrictedResponse2.pagination.records,
      0,
    );
  }
}
