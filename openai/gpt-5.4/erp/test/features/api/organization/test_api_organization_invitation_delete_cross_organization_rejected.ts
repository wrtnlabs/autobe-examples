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

export async function test_api_organization_invitation_delete_cross_organization_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(authorized);
  const firstOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(firstOrganization);
  const secondOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 12,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(secondOrganization);
  const invitation =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerConnection,
      {
        params: {
          organizationId: firstOrganization.id,
        },
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          hrm_time_tracking_role_id: null,
          message: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHrmTimeTrackingOrganizationInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  TestValidator.equals(
    "invitation belongs to first organization",
    invitation.organization.id,
    firstOrganization.id,
  );
  TestValidator.notEquals(
    "organizations are different",
    firstOrganization.id,
    secondOrganization.id,
  );
  await TestValidator.httpError(
    "cross-organization invitation delete is rejected",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.invitations.erase(
        ownerConnection,
        {
          organizationId: secondOrganization.id,
          invitationId: invitation.id,
        },
      );
    },
  );
  TestValidator.equals(
    "invitation remains scoped to original organization after rejected delete",
    invitation.organization.id,
    firstOrganization.id,
  );
  TestValidator.notEquals(
    "invitation is not scoped to second organization",
    invitation.organization.id,
    secondOrganization.id,
  );
}
