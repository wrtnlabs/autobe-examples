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

export async function test_api_organization_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate using utility function
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
  // 2. Create organization as the member (establishes ownership)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Update organization with all fields modified
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    currency: "EUR",
    timezone: "America/New_York",
    fiscal_start_month: 6,
  } satisfies IHrmPlatformOrganization.IUpdate;
  const updatedOrganization =
    await api.functional.hrmPlatform.member.organizations.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: updateBody,
      },
    );
  typia.assert(updatedOrganization);
  // 4. Verify all updated fields match the input
  TestValidator.equals(
    "name updated",
    updatedOrganization.name,
    updateBody.name!,
  );
  TestValidator.equals(
    "description updated",
    updatedOrganization.description,
    updateBody.description,
  );
  TestValidator.equals(
    "currency updated",
    updatedOrganization.currency,
    updateBody.currency!,
  );
  TestValidator.equals(
    "timezone updated",
    updatedOrganization.timezone,
    updateBody.timezone!,
  );
  TestValidator.equals(
    "fiscal_start_month updated",
    updatedOrganization.fiscal_start_month,
    updateBody.fiscal_start_month!,
  );
  // 5. Verify updated_at timestamp is newer than created_at and previous updated_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedOrganization.updated_at) >
      new Date(updatedOrganization.created_at),
  );
  TestValidator.predicate(
    "updated_at changed after update",
    new Date(updatedOrganization.updated_at) >
      new Date(organization.updated_at),
  );
  // 6. Verify partial update - only update name, other fields remain unchanged
  const partialUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IHrmPlatformOrganization.IUpdate;
  const partiallyUpdated =
    await api.functional.hrmPlatform.member.organizations.update(
      memberConnection,
      {
        organizationId: updatedOrganization.id,
        body: partialUpdateBody,
      },
    );
  typia.assert(partiallyUpdated);
  TestValidator.equals(
    "name changed in partial update",
    partiallyUpdated.name,
    partialUpdateBody.name!,
  );
  TestValidator.equals(
    "description unchanged in partial update",
    partiallyUpdated.description,
    updatedOrganization.description,
  );
  TestValidator.equals(
    "currency unchanged in partial update",
    partiallyUpdated.currency,
    updatedOrganization.currency,
  );
  TestValidator.equals(
    "timezone unchanged in partial update",
    partiallyUpdated.timezone,
    updatedOrganization.timezone,
  );
  TestValidator.equals(
    "fiscal_start_month unchanged in partial update",
    partiallyUpdated.fiscal_start_month,
    updatedOrganization.fiscal_start_month,
  );
  TestValidator.predicate(
    "updated_at changed after partial update",
    new Date(partiallyUpdated.updated_at) >
      new Date(updatedOrganization.updated_at),
  );
}
