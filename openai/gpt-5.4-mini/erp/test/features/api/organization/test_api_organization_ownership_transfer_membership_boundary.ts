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

export async function test_api_organization_ownership_transfer_membership_boundary(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!123",
      name: RandomGenerator.name(),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com/" as string & tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const organization =
    await generate_random_erp_hrm_time_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!123",
      name: RandomGenerator.name(),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com/" as string & tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const transferred =
    await api.functional.erpHrmTime.member.organizations.ownership_transfer.create(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          ownerMemberId: member.id,
        } satisfies IErpHrmTimeOrganization.IOwnershipTransfer,
      },
    );
  typia.assert(transferred);
  TestValidator.equals(
    "organization id should remain the same after ownership transfer",
    transferred.id,
    organization.id,
  );
  const outsiderConnection: api.IConnection = { host: connection.host };
  const outsider = await authorize_member_join(outsiderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!123",
      name: RandomGenerator.name(),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com/" as string & tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(outsider);
  const secondOrganization =
    await generate_random_erp_hrm_time_member_organizations_create(
      outsiderConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(secondOrganization);
  await TestValidator.error(
    "ownership transfer should reject a target member outside the organization membership boundary",
    async () => {
      await api.functional.erpHrmTime.member.organizations.ownership_transfer.create(
        ownerConnection,
        {
          organizationId: organization.id,
          body: {
            ownerMemberId: outsider.id,
          } satisfies IErpHrmTimeOrganization.IOwnershipTransfer,
        },
      );
    },
  );
  TestValidator.equals(
    "the original organization should still be the same tenant after rejected cross-organization transfer",
    organization.id,
    organization.id,
  );
}
