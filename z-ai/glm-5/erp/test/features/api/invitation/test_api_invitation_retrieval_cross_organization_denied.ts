import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_invitations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_invitations_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_invitation_retrieval_cross_organization_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member 1 and create Organization A
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1Auth);
  const organizationA =
    await generate_random_erp_hrm_member_organizations_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: RandomGenerator.pick(["USD", "EUR", "KRW"] as const),
          timezone: RandomGenerator.pick([
            "America/New_York",
            "Asia/Seoul",
            "Europe/London",
          ] as const),
          fiscalStartMonth: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        },
      },
    );
  typia.assert(organizationA);
  // Step 2: Create an invitation in Organization A
  const invitationA =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      member1Connection,
      {
        params: {
          organizationId: organizationA.id,
        },
      },
    );
  typia.assert(invitationA);
  // Step 3: Register Member 2 and create Organization B (separate account)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Auth);
  const organizationB =
    await generate_random_erp_hrm_member_organizations_create(
      member2Connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: RandomGenerator.pick(["USD", "EUR", "KRW"] as const),
          timezone: RandomGenerator.pick([
            "America/New_York",
            "Asia/Seoul",
            "Europe/London",
          ] as const),
          fiscalStartMonth: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        },
      },
    );
  typia.assert(organizationB);
  // Step 4: Member 2 attempts to retrieve invitation from Organization A
  // This should fail because Member 2 does not belong to Organization A
  await TestValidator.httpError(
    "should deny cross-organization invitation retrieval",
    404,
    async () => {
      await api.functional.erpHrm.member.organizations.invitations.at(
        member2Connection,
        {
          organizationId: organizationA.id,
          invitationId: invitationA.id,
        },
      );
    },
  );
}
