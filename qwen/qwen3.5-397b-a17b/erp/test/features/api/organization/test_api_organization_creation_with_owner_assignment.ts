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

export async function test_api_organization_creation_with_owner_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Prepare organization data with all required and optional fields
  const organizationName = RandomGenerator.paragraph({ sentences: 2 });
  const organizationDescription = RandomGenerator.content({ paragraphs: 2 });
  const organizationLogo = typia.random<string & tags.Format<"uri">>();
  // 3. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: organizationName,
          description: organizationDescription,
          logo: organizationLogo,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1 as const,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 4. Validate organization entity - business logic only (typia.assert handles type validation)
  TestValidator.equals(
    "name matches input",
    organization.name,
    organizationName,
  );
  TestValidator.equals(
    "description matches input",
    organization.description,
    organizationDescription,
  );
  TestValidator.equals(
    "logo matches input",
    organization.logo,
    organizationLogo,
  );
  TestValidator.equals("currency matches input", organization.currency, "USD");
  TestValidator.equals(
    "timezone matches input",
    organization.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "fiscal_start_month matches input",
    organization.fiscal_start_month,
    1,
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    organization.deleted_at,
    null,
  );
}
