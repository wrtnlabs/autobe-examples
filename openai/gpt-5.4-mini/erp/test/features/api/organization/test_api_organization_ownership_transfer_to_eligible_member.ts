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

export async function test_api_organization_ownership_transfer_to_eligible_member(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const organization =
    await generate_random_erp_hrm_time_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const newOwnerConnection: api.IConnection = { host: connection.host };
  const newOwner = await authorize_member_join(newOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/join-2",
      referrer: "https://example.com/referrer-2",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(newOwner);
  const transferred =
    await api.functional.erpHrmTime.member.organizations.ownership_transfer.create(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          ownerMemberId: newOwner.id,
        } satisfies IErpHrmTimeOrganization.IOwnershipTransfer,
      },
    );
  typia.assert(transferred);
  TestValidator.equals(
    "organization id preserved",
    transferred.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name preserved",
    transferred.name,
    organization.name,
  );
  await TestValidator.httpError(
    "ownership transfer to invalid member should be rejected",
    [400, 403, 409],
    async () => {
      await api.functional.erpHrmTime.member.organizations.ownership_transfer.create(
        ownerConnection,
        {
          organizationId: organization.id,
          body: {
            ownerMemberId: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IErpHrmTimeOrganization.IOwnershipTransfer,
        },
      );
    },
  );
}
