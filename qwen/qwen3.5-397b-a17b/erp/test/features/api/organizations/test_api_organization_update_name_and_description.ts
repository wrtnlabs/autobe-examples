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

export async function test_api_organization_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const originalOrg =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(originalOrg);
  // 3. Update organization name and description
  const newName = RandomGenerator.paragraph({ sentences: 1 });
  const newDescription = RandomGenerator.content({ paragraphs: 1 });
  const updatedOrg =
    await api.functional.hrmPlatform.member.organizations.update(
      memberConnection,
      {
        organizationId: originalOrg.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IHrmPlatformOrganization.IUpdate,
      },
    );
  typia.assert(updatedOrg);
  // 4. Validate updated fields
  TestValidator.equals("name updated", updatedOrg.name, newName);
  TestValidator.equals(
    "description updated",
    updatedOrg.description,
    newDescription,
  );
  // 5. Validate preserved fields
  TestValidator.equals(
    "currency preserved",
    updatedOrg.currency,
    originalOrg.currency,
  );
  TestValidator.equals(
    "timezone preserved",
    updatedOrg.timezone,
    originalOrg.timezone,
  );
  TestValidator.equals(
    "fiscal_start_month preserved",
    updatedOrg.fiscal_start_month,
    originalOrg.fiscal_start_month,
  );
  TestValidator.equals("id preserved", updatedOrg.id, originalOrg.id);
  // 6. Validate timestamp updated
  TestValidator.predicate(
    "updated_at is later",
    new Date(updatedOrg.updated_at) > new Date(originalOrg.updated_at),
  );
}