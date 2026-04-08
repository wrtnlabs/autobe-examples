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
 * Test organization list retrieval by authenticated member.
 *
 * Validates the complete organization listing workflow including member authentication, multiple organization creation, and paginated list retrieval. Ensures that the organization list endpoint correctly returns all organizations where the member has membership with proper pagination metadata and sorting.
 *
 * Special attention is given to verifying that all required fields (id, name, currency, timezone, created_at) are present in each organization record, optional fields (description, logo_url) are handled correctly, and results are sorted by created_at in descending order by default.
 *
 * 1. Member registers with email and credentials.
 * 2. Member creates first organization with name, currency, timezone, and fiscal settings.
 * 3. Member creates second organization with different configuration.
 * 4. Member creates third organization with optional description and logo_url.
 * 5. Member queries organization list endpoint without filters.
 * 6. Validates all three organizations are returned with correct fields and pagination.
 * 7. Validates organizations are sorted by created_at in descending order.
 */
export async function test_api_organization_list_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create first organization
  const org1 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(org1);
  // 3. Create second organization
  const org2 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "EUR",
        timezone: "Europe/London",
        fiscal_start_month: 4,
      },
    },
  );
  typia.assert(org2);
  // 4. Create third organization with optional fields
  const org3 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        logo_url: typia.assert<string & tags.MaxLength<80000> & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: 7,
      },
    },
  );
  typia.assert(org3);
  // 5. Query organization list
  const result = await api.functional.hrmPlatform.member.organizations.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(result);
  // 6. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.equals("total records", result.pagination.records, 3);
  TestValidator.predicate(
    "total pages is positive",
    result.pagination.pages > 0,
  );
  // 7. Validate all organizations are returned
  TestValidator.equals("organization count", result.data.length, 3);
  // 8. Validate required fields exist in each organization
  for (const org of result.data) {
    TestValidator.predicate("id exists", org.id !== undefined);
    TestValidator.predicate("name exists", org.name !== undefined);
    TestValidator.predicate("currency exists", org.currency !== undefined);
    TestValidator.predicate("timezone exists", org.timezone !== undefined);
    TestValidator.predicate("created_at exists", org.created_at !== undefined);
  }
  // 9. Validate sorting by created_at descending (newest first)
  const sortedByCreatedAt = [...result.data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.equals(
    "sorted by created_at desc",
    result.data.map((o) => o.id),
    sortedByCreatedAt.map((o) => o.id),
  );
  // 10. Validate org3 has optional fields
  const org3Result = result.data.find((o) => o.id === org3.id);
  TestValidator.predicate("org3 exists in results", org3Result !== undefined);
  if (org3Result !== undefined) {
    TestValidator.predicate(
      "org3 has description",
      org3Result.description !== undefined,
    );
    TestValidator.predicate(
      "org3 has logo_url",
      org3Result.logo_url !== undefined,
    );
  }
}