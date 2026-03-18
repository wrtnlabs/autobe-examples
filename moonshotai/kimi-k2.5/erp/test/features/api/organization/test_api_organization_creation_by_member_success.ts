import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_creation_by_member_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: "America/New_York",
      locale: "en-US",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Create organization with the authenticated member connection
  const body = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_url: typia.random<string & tags.Format<"url">>(),
    currency: "USD",
    timezone: "America/New_York",
    fiscal_year_start_month: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
  } satisfies IErpHrmOrganization.ICreate;
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body,
      },
    );
  typia.assert(organization);
  // 3. Validate response matches request
  TestValidator.equals("name matches", organization.name, body.name);
  TestValidator.equals(
    "description matches",
    organization.description,
    body.description,
  );
  TestValidator.equals(
    "logo_url matches",
    organization.logo_url,
    body.logo_url,
  );
  TestValidator.equals(
    "currency matches",
    organization.currency,
    body.currency,
  );
  TestValidator.equals(
    "timezone matches",
    organization.timezone,
    body.timezone,
  );
  TestValidator.equals(
    "fiscal_year_start_month matches",
    organization.fiscal_year_start_month,
    body.fiscal_year_start_month,
  );
  // 4. Validate owner is the authenticated member
  TestValidator.equals(
    "owner is authenticated member",
    organization.owner.id,
    authorizedMember.id,
  );
  // 5. Validate timestamps and status
  TestValidator.predicate(
    "created_at is valid",
    organization.created_at != null,
  );
  TestValidator.predicate(
    "updated_at is valid",
    organization.updated_at != null,
  );
  TestValidator.equals("organization is active", organization.deleted_at, null);
}
