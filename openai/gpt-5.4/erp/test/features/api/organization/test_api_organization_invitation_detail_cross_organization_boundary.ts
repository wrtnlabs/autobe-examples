import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationInvitation";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { generate_random_hrm_time_tracking_owner_organizations_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_invitations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_organization_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_organization_invitation";

export async function test_api_organization_invitation_detail_cross_organization_boundary(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  const organizationA =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-a-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organizationA);
  const organizationB =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-b-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "UTC",
          fiscal_start_month: 12,
        },
      },
    );
  typia.assert(organizationB);
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const invitationMessageA = RandomGenerator.paragraph({ sentences: 2 });
  const invitationMessageB = RandomGenerator.paragraph({ sentences: 2 });
  const invitationA =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerConnection,
      {
        params: {
          organizationId: organizationA.id,
        },
        body: {
          email: invitedEmail,
          message: invitationMessageA,
          hrm_time_tracking_role_id: null,
        },
      },
    );
  typia.assert(invitationA);
  const invitationB =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerConnection,
      {
        params: {
          organizationId: organizationB.id,
        },
        body: {
          email: invitedEmail,
          message: invitationMessageB,
          hrm_time_tracking_role_id: null,
        },
      },
    );
  typia.assert(invitationB);
  TestValidator.notEquals(
    "organization ids differ across invitations",
    invitationA.organization.id,
    invitationB.organization.id,
  );
  TestValidator.notEquals(
    "invitation ids differ across organizations",
    invitationA.id,
    invitationB.id,
  );
  await TestValidator.httpError(
    "cross-organization invitation detail is not disclosed",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.invitations.at(
        ownerConnection,
        {
          organizationId: organizationA.id,
          invitationId: invitationB.id,
        },
      );
    },
  );
  const found =
    await api.functional.hrmTimeTracking.owner.organizations.invitations.at(
      ownerConnection,
      {
        organizationId: organizationA.id,
        invitationId: invitationA.id,
      },
    );
  typia.assert(found);
  TestValidator.equals("found invitation id matches", found.id, invitationA.id);
  TestValidator.equals(
    "found invitation organization matches",
    found.organization.id,
    organizationA.id,
  );
  TestValidator.equals(
    "found invitation email matches shared invitee",
    found.email,
    invitedEmail,
  );
  TestValidator.equals(
    "found invitation message matches organization-specific invitation",
    found.message,
    invitationMessageA,
  );
}
