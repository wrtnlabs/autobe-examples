import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_multi_membership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(registeredMember);
  // 2. Verify registered member has at least one organization (as owner)
  TestValidator.notEquals(
    "member should have at least one organization",
    registeredMember.organization_memberships.length,
    0,
  );
  // 3. Fetch all organizations using member's own connection (token from registration)
  const organizationsConnection: api.IConnection = { host: connection.host };
  organizationsConnection.headers = {
    Authorization: registeredMember.token.access,
  };
  const organizationPage: IPageIHrmsOrganization.ISummary =
    await api.functional.hrms.member.organizations.index(
      organizationsConnection,
      {
        body: {},
      },
    );
  typia.assert(organizationPage);
  // 4. Validate pagination structure
  const pagination: IPage.IPagination = organizationPage.pagination;
  TestValidator.predicate(
    "pagination has valid current",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has valid records",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination has valid pages", pagination.pages >= 0);
  // 5. Validate each organization record
  const organizationIds = new Set<string>();
  for (let index = 0; index < organizationPage.data.length; index++) {
    const org = organizationPage.data[index];
    // Validate organization ID format
    TestValidator.predicate(
      `organization ${index} has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        org.id,
      ),
    );
    // Validate organization name exists
    TestValidator.notEquals(`organization ${index} has name`, org.name, "");
    // Validate currency format (3 uppercase letters)
    TestValidator.predicate(
      `organization ${index} has valid currency`,
      org.currency.length === 3,
    );
    // Validate timezone format (contains /)
    TestValidator.predicate(
      `organization ${index} has valid timezone`,
      org.timezone.includes("/"),
    );
    // Validate fiscal_start_month is between 1-12
    TestValidator.predicate(
      `organization ${index} fiscal_start_month is valid`,
      org.fiscal_start_month >= 1 && org.fiscal_start_month <= 12,
    );
    // Validate owner reference
    TestValidator.predicate(
      `organization ${index} has owner`,
      org.owner !== null && org.owner !== undefined,
    );
    if (org.owner) {
      TestValidator.predicate(
        `organization ${index} owner has valid ID`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          org.owner.id,
        ),
      );
      TestValidator.notEquals(
        `organization ${index} owner has display_name`,
        org.owner.display_name,
        "",
      );
    }
    // Validate timestamps are valid date-time strings
    TestValidator.predicate(
      `organization ${index} has valid created_at`,
      !isNaN(Date.parse(org.created_at)),
    );
    TestValidator.predicate(
      `organization ${index} has valid updated_at`,
      !isNaN(Date.parse(org.updated_at)),
    );
    // Check no duplicate organization IDs
    TestValidator.notEquals(
      `organization ${index} ID is unique`,
      organizationIds.has(org.id),
      true,
    );
    organizationIds.add(org.id);
  }
  // 6. Validate pagination metadata matches actual data
  TestValidator.equals(
    "pagination records count matches data length",
    pagination.records,
    organizationPage.data.length,
  );
  // 7. Verify at least one organization exists in results
  TestValidator.predicate(
    "at least one organization returned",
    organizationPage.data.length > 0,
  );
}