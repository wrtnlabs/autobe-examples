import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_member_organizations_create";
import { prepare_random_erp_hrm_time_organization } from "../../../prepare/prepare_random_erp_hrm_time_organization";

export async function test_api_organization_creation_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const organizationName = `org-${RandomGenerator.alphabets(8)}`;
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const logoImageUrl =
    `https://example.com/logos/${RandomGenerator.alphabets(8)}.png` satisfies string &
      tags.Format<"uri">;
  const organization =
    await generate_random_erp_hrm_time_member_organizations_create(
      memberConnection,
      {
        body: {
          name: organizationName,
          description,
          logoImageUrl,
        },
      },
    );
  typia.assert(organization);
  TestValidator.equals(
    "organization name",
    organization.name,
    organizationName,
  );
  TestValidator.equals(
    "organization description",
    organization.description,
    description,
  );
  TestValidator.equals(
    "organization logo",
    organization.logoImageUrl,
    logoImageUrl,
  );
  TestValidator.equals("organization deletedAt", organization.deletedAt, null);
  TestValidator.predicate("organization id exists", organization.id.length > 0);
  TestValidator.predicate(
    "organization createdAt exists",
    organization.createdAt.length > 0,
  );
  TestValidator.predicate(
    "organization updatedAt exists",
    organization.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "organization owner exists",
    organization.ownerMember !== null,
  );
  TestValidator.predicate(
    "organization status exists",
    organization.status.length > 0,
  );
  const secondOrganization =
    await generate_random_erp_hrm_time_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
        },
      },
    );
  typia.assert(secondOrganization);
  TestValidator.equals(
    "first organization remains persisted after creating another tenant",
    organization.name,
    organizationName,
  );
  TestValidator.notEquals(
    "organization ids are unique across tenants",
    organization.id,
    secondOrganization.id,
  );
  TestValidator.notEquals(
    "organization names are distinct",
    organization.name,
    secondOrganization.name,
  );
}
