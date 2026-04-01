import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function test_api_organization_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Select the organization context
  const selectedOrganization =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrganization);
  // 4. Retrieve the organization details
  const retrievedOrganization =
    await api.functional.hrmPlatform.member.organizations.at(memberConnection, {
      organizationId: organization.id,
    });
  typia.assert(retrievedOrganization);
  // 5. Validate organization data matches
  TestValidator.equals(
    "organization id",
    retrievedOrganization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name",
    retrievedOrganization.name,
    organization.name,
  );
  TestValidator.equals(
    "organization currency",
    retrievedOrganization.currency,
    organization.currency,
  );
  TestValidator.equals(
    "organization timezone",
    retrievedOrganization.timezone,
    organization.timezone,
  );
  TestValidator.equals(
    "organization fiscal_start_month",
    retrievedOrganization.fiscal_start_month,
    organization.fiscal_start_month,
  );
  TestValidator.predicate(
    "organization has created_at",
    retrievedOrganization.created_at !== undefined,
  );
  TestValidator.predicate(
    "organization has updated_at",
    retrievedOrganization.updated_at !== undefined,
  );
  TestValidator.predicate(
    "organization is not deleted",
    retrievedOrganization.deleted_at === null,
  );
}
