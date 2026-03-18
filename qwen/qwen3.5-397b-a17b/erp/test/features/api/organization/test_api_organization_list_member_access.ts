import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function test_api_organization_list_member_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Create an organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          logo_url: typia.random<(string & tags.Format<"uri">) | null>(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 4. Retrieve organization list
  const result = await api.functional.hrmPlatform.member.organizations.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "desc",
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(result);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 20);
  TestValidator.equals("total records", result.pagination.records, 1);
  TestValidator.equals("total pages", result.pagination.pages, 1);
  // 6. Validate organization list contains created organization
  TestValidator.equals("organization count", result.data.length, 1);
  const createdOrg = result.data.find((org) => org.id === organization.id);
  TestValidator.predicate(
    "created organization found",
    createdOrg !== undefined,
  );
  if (createdOrg) {
    // 7. Validate organization summary fields
    TestValidator.equals("organization id", createdOrg.id, organization.id);
    TestValidator.equals(
      "organization name",
      createdOrg.name,
      organization.name,
    );
    TestValidator.equals(
      "organization description",
      createdOrg.description,
      organization.description,
    );
    TestValidator.equals(
      "organization logo_url",
      createdOrg.logo_url,
      organization.logo_url,
    );
    TestValidator.equals(
      "organization currency",
      createdOrg.currency,
      organization.currency,
    );
    TestValidator.equals(
      "organization timezone",
      createdOrg.timezone,
      organization.timezone,
    );
    TestValidator.equals(
      "fiscal_start_month",
      createdOrg.fiscal_start_month,
      organization.fiscal_start_month satisfies number | null | undefined as number | null | undefined,
    );
    TestValidator.equals(
      "created_at",
      createdOrg.created_at,
      organization.created_at,
    );
    // 8. Validate owner_id is NOT exposed in response (should not exist in ISummary)
    TestValidator.predicate(
      "owner_id not exposed",
      !("owner_id" in createdOrg),
    );
  }
}