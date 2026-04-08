import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Test first page retrieval with default limit
  const firstPage: IPageIHrmOrganization.ISummary =
    await api.functional.hrm.member.organizations.index(memberConnection, {
      body: {} satisfies IHrmOrganization.IRequest,
    });
  typia.assert(firstPage);
  // Validate pagination metadata structure and consistency
  TestValidator.predicate(
    "pagination has valid current page",
    firstPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    firstPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate("data array exists", Array.isArray(firstPage.data));
  TestValidator.predicate(
    "records count matches data",
    firstPage.pagination.records >= firstPage.data.length,
  );
  // 3. Test second page retrieval using cursor from first page response
  if (
    firstPage.data.length > 0 &&
    firstPage.pagination.records > firstPage.data.length
  ) {
    const lastOrganization: IHrmOrganization.ISummary =
      firstPage.data[firstPage.data.length - 1];
    const secondPage: IPageIHrmOrganization.ISummary =
      await api.functional.hrm.member.organizations.index(memberConnection, {
        body: {
          cursor: lastOrganization.created_at,
        } satisfies IHrmOrganization.IRequest,
      });
    typia.assert(secondPage);
    // Validate cursor pagination works
    TestValidator.predicate(
      "second page retrieved successfully",
      secondPage.pagination.current >= firstPage.pagination.current,
    );
  }
  // 4. Test custom limit parameter
  const customLimitPage: IPageIHrmOrganization.ISummary =
    await api.functional.hrm.member.organizations.index(memberConnection, {
      body: {
        limit: 10,
      } satisfies IHrmOrganization.IRequest,
    });
  typia.assert(customLimitPage);
  // Validate limit is respected
  TestValidator.predicate(
    "custom limit respected",
    customLimitPage.data.length <= customLimitPage.pagination.limit,
  );
  TestValidator.equals(
    "limit matches request",
    customLimitPage.pagination.limit,
    10,
  );
  // 5. Validate organization data structure (first organization if exists)
  if (firstPage.data.length > 0) {
    const org: IHrmOrganization.ISummary = firstPage.data[0];
    typia.assert(org);
    // Validate required fields
    TestValidator.equals(
      "organization has valid UUID",
      typeof org.id === "string" && org.id.length > 0,
      true,
    );
    TestValidator.equals(
      "organization has name",
      typeof org.name === "string" && org.name.length > 0,
      true,
    );
    TestValidator.equals(
      "organization has currency",
      typeof org.currency === "string" && org.currency.length > 0,
      true,
    );
    TestValidator.equals(
      "organization has timezone",
      typeof org.timezone === "string" && org.timezone.length > 0,
      true,
    );
    TestValidator.predicate(
      "organization has valid fiscal_start_month",
      typeof org.fiscal_start_month === "number" &&
        org.fiscal_start_month >= 1 &&
        org.fiscal_start_month <= 12,
    );
  }
}
