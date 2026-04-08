import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test organization list search functionality with case-insensitive partial name matching.
 *
 * Validates the complete organization search flow including member authentication, organization creation with distinct names, and search queries with various keywords. Ensures that the search functionality correctly filters organizations by name using case-insensitive partial matching.
 *
 * Special attention is given to verifying that partial matches work correctly, empty search returns all organizations, and pagination metadata accurately reflects the filtered result counts.
 *
 * 1. Member registers with unique email and credentials.
 * 2. Member creates three organizations with distinct names containing different keywords.
 * 3. Member searches with 'tech' keyword - validates 2 organizations returned.
 * 4. Member searches with 'digital' keyword - validates 1 organization returned.
 * 5. Member searches with null search - validates all 3 organizations returned.
 * 6. Validates pagination metadata reflects correct filtered counts for each search.
 * 7. Validates case-insensitivity by searching with 'TECH' and 'Tech'.
 */
export async function test_api_organization_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create three organizations with distinct names
  const org1 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: {
        name: "TechCorp Solutions",
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(org1);
  const org2 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: {
        name: "Digital Marketing Agency",
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(org2);
  const org3 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: {
        name: "Tech Innovations Lab",
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(org3);
  // 3. Search with 'tech' keyword (lowercase) - should return 2 organizations
  const searchTech =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          search: "tech",
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(searchTech);
  TestValidator.equals("tech search count", searchTech.data.length, 2);
  TestValidator.equals(
    "tech search pagination records",
    searchTech.pagination.records,
    2,
  );
  const techOrgNames = searchTech.data.map((org) => org.name.toLowerCase());
  TestValidator.predicate(
    "tech search contains techcorp",
    techOrgNames.some((n) => n.includes("techcorp")),
  );
  TestValidator.predicate(
    "tech search contains innovations",
    techOrgNames.some((n) => n.includes("innovations")),
  );
  // 4. Search with 'digital' keyword - should return 1 organization
  const searchDigital =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          search: "digital",
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(searchDigital);
  TestValidator.equals("digital search count", searchDigital.data.length, 1);
  TestValidator.equals(
    "digital search pagination records",
    searchDigital.pagination.records,
    1,
  );
  TestValidator.equals(
    "digital search result",
    searchDigital.data[0]?.name,
    "Digital Marketing Agency",
  );
  // 5. Search with null - should return all 3 organizations
  const searchNull =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          search: null,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(searchNull);
  TestValidator.equals("null search count", searchNull.data.length, 3);
  TestValidator.equals(
    "null search pagination records",
    searchNull.pagination.records,
    3,
  );
  // 6. Search with empty string - should return all 3 organizations
  const searchEmpty =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          search: "",
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(searchEmpty);
  TestValidator.equals("empty search count", searchEmpty.data.length, 3);
  TestValidator.equals(
    "empty search pagination records",
    searchEmpty.pagination.records,
    3,
  );
  // 7. Validate case-insensitivity - 'TECH' should return same as 'tech'
  const searchTECH =
    await api.functional.hrmPlatform.member.organizations.index(
      memberConnection,
      {
        body: {
          search: "TECH",
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(searchTECH);
  TestValidator.equals("TECH search count", searchTECH.data.length, 2);
  TestValidator.equals(
    "tech and TECH same results",
    searchTech.data.length,
    searchTECH.data.length,
  );
  const techIds = searchTech.data.map((org) => org.id).sort();
  const TECHIds = searchTECH.data.map((org) => org.id).sort();
  TestValidator.equals("tech and TECH same organizations", techIds, TECHIds);
  // 8. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    searchTech.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchTech.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination pages calculated",
    searchTech.pagination.pages,
    Math.ceil(searchTech.pagination.records / searchTech.pagination.limit),
  );
}
