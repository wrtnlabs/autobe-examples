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

export async function test_api_organization_creation_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
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
  // 2. Create authenticated connection for organization operations
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 3. Prepare organization data with all fields including optionals
  const organizationInput: IHrmPlatformOrganization.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    logo_url: typia.random<string & tags.Format<"uri">>(),
    currency: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  };
  // 4. Create organization using utility function
  const organization: IHrmPlatformOrganization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      { body: organizationInput },
    );
  typia.assert(organization);
  // 5. Verify required fields match input
  TestValidator.equals(
    "organization name",
    organization.name,
    organizationInput.name,
  );
  TestValidator.equals(
    "currency code",
    organization.currency,
    organizationInput.currency,
  );
  TestValidator.equals(
    "timezone",
    organization.timezone,
    organizationInput.timezone,
  );
  TestValidator.equals(
    "fiscal start month",
    organization.fiscal_start_month,
    organizationInput.fiscal_start_month,
  );
  // 6. Verify optional fields are correctly stored
  TestValidator.equals(
    "description matches",
    organization.description,
    organizationInput.description,
  );
  TestValidator.equals(
    "logo_url matches",
    organization.logo_url,
    organizationInput.logo_url,
  );
  // 7. Verify owner relation contains member profile information
  TestValidator.equals(
    "owner id matches",
    organization.owner.id,
    memberAuth.member.id,
  );
  TestValidator.equals(
    "owner email matches",
    organization.owner.email,
    memberAuth.member.email,
  );
  TestValidator.equals(
    "owner display_name matches",
    organization.owner.display_name,
    memberAuth.member.display_name,
  );
  TestValidator.equals(
    "owner avatar_url matches",
    organization.owner.avatar_url,
    memberAuth.member.avatar_url,
  );
  TestValidator.equals(
    "owner phone_number matches",
    organization.owner.phone_number,
    memberAuth.member.phone_number,
  );
  // 8. Verify organization is active (not soft-deleted)
  TestValidator.equals(
    "deleted_at is null for active org",
    organization.deleted_at,
    null,
  );
}
