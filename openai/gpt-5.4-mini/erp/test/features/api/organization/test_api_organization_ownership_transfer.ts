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

export async function test_api_organization_ownership_transfer(
  connection: api.IConnection,
): Promise<void> {
  const createAuthorizedConnection = (
    token: IAuthorizationToken,
  ): api.IConnection => ({
    host: connection.host,
    headers: {
      Authorization: `Bearer ${token.access}`,
    },
  });
  const ownerJoin = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@example.com` as string &
          tags.Format<"email">,
        password: "Test1234!",
        name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(ownerJoin);
  const ownerConnection = createAuthorizedConnection(ownerJoin.token);
  const organization =
    await generate_random_erp_hrm_time_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const memberJoin = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@example.com` as string &
          tags.Format<"email">,
        password: "Test1234!",
        name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(memberJoin);
  const memberConnection = createAuthorizedConnection(memberJoin.token);
  const transferred =
    await api.functional.erpHrmTime.member.organizations.ownership_transfer.create(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          ownerMemberId: memberJoin.id,
        } satisfies IErpHrmTimeOrganization.IOwnershipTransfer,
      },
    );
  typia.assert(transferred);
  TestValidator.equals(
    "organization id should remain the same after ownership transfer",
    transferred.id,
    organization.id,
  );
  TestValidator.notEquals(
    "organization owner should change after transfer",
    transferred.ownerMember,
    organization.ownerMember,
  );
  const outsiderJoin = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@example.com` as string &
          tags.Format<"email">,
        password: "Test1234!",
        name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(outsiderJoin);
  const outsiderConnection = createAuthorizedConnection(outsiderJoin.token);
  await TestValidator.error(
    "non-owner should not transfer ownership",
    async () => {
      await api.functional.erpHrmTime.member.organizations.ownership_transfer.create(
        outsiderConnection,
        {
          organizationId: organization.id,
          body: {
            ownerMemberId: ownerJoin.id,
          } satisfies IErpHrmTimeOrganization.IOwnershipTransfer,
        },
      );
    },
  );
  await TestValidator.error(
    "target member outside organization should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.organizations.ownership_transfer.create(
        ownerConnection,
        {
          organizationId: organization.id,
          body: {
            ownerMemberId: outsiderJoin.id,
          } satisfies IErpHrmTimeOrganization.IOwnershipTransfer,
        },
      );
    },
  );
  const memberRecheck =
    await api.functional.erpHrmTime.member.organizations.ownership_transfer.create(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          ownerMemberId: ownerJoin.id,
        } satisfies IErpHrmTimeOrganization.IOwnershipTransfer,
      },
    );
  typia.assert(memberRecheck);
  TestValidator.equals(
    "organization should remain accessible after ownership transfer",
    memberRecheck.id,
    organization.id,
  );
}
