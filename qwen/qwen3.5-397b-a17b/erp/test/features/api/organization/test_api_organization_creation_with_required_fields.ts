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

export async function test_api_organization_creation_with_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create organization with required fields only
  const orgInput = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    currency: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IHrmPlatformOrganization.ICreate;
  const memberConnection: api.IConnection = { host: connection.host };
  const organization: IHrmPlatformOrganization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: orgInput,
      },
    );
  typia.assert(organization);
  // 3. Verify organization data matches input
  TestValidator.equals(
    "organization name matches input",
    organization.name,
    orgInput.name,
  );
  TestValidator.equals(
    "currency matches input",
    organization.currency,
    orgInput.currency,
  );
  TestValidator.equals(
    "timezone matches input",
    organization.timezone,
    orgInput.timezone,
  );
  TestValidator.equals(
    "fiscal_start_month matches input",
    organization.fiscal_start_month,
    orgInput.fiscal_start_month,
  );
  // 4. Verify owner relation points to the creating member
  TestValidator.equals(
    "owner id matches member id",
    organization.owner.id,
    memberAuth.member.id,
  );
  TestValidator.equals(
    "owner email matches member email",
    organization.owner.email,
    memberAuth.member.email,
  );
  TestValidator.equals(
    "owner display_name matches member display_name",
    organization.owner.display_name,
    memberAuth.member.display_name,
  );
  // 5. Verify organization is active (not soft-deleted)
  TestValidator.equals(
    "deleted_at is null for active organization",
    organization.deleted_at,
    null,
  );
  // 6. Verify optional fields are undefined when not provided
  TestValidator.equals(
    "description is undefined when not provided",
    organization.description,
    undefined,
  );
  TestValidator.equals(
    "logo_url is undefined when not provided",
    organization.logo_url,
    undefined,
  );
}
