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

export async function test_api_organization_creation_minimal_payload(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const organizationConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${joined.token.access}`,
    },
  };
  const name = `org-${RandomGenerator.alphabets(8)}`;
  const organization =
    await generate_random_erp_hrm_time_member_organizations_create(
      organizationConnection,
      {
        body: {
          name,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organization);
  TestValidator.equals("organization name", organization.name, name);
  TestValidator.predicate(
    "organization has owner relation",
    organization.ownerMember !== null && organization.ownerMember !== undefined,
  );
  TestValidator.equals(
    "organization description omitted",
    organization.description,
    null,
  );
  TestValidator.equals(
    "organization logo omitted",
    organization.logoImageUrl,
    null,
  );
  TestValidator.equals("organization is active", organization.status, "active");
  TestValidator.equals("organization deletedAt", organization.deletedAt, null);
}
