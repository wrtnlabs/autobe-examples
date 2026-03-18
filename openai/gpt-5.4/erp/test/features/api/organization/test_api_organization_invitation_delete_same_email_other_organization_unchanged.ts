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

export async function test_api_organization_invitation_delete_same_email_other_organization_unchanged(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(owner);
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
          timezone: "UTC",
          fiscal_start_month: 12,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(secondOrganization);
  TestValidator.notEquals(
    "organizations are independent",
    firstOrganization.id,
    secondOrganization.id,
  );
  const sharedEmail = typia.random<string & tags.Format<"email">>();
  const firstInvitation =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerConnection,
      {
        params: {
          organizationId: firstOrganization.id,
        },
        body: {
          email: sharedEmail,
          message: RandomGenerator.paragraph({ sentences: 3 }),
          hrm_time_tracking_role_id: null,
        } satisfies IHrmTimeTrackingOrganizationInvitation.ICreate,
      },
    );
  typia.assert(firstInvitation);
  const secondInvitation =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerConnection,
      {
        params: {
          organizationId: secondOrganization.id,
        },
        body: {
          email: sharedEmail,
          message: RandomGenerator.paragraph({ sentences: 3 }),
          hrm_time_tracking_role_id: null,
        } satisfies IHrmTimeTrackingOrganizationInvitation.ICreate,
      },
    );
  typia.assert(secondInvitation);
  TestValidator.equals(
    "first invitation email matches shared invitee",
    firstInvitation.email,
    sharedEmail,
  );
  TestValidator.equals(
    "second invitation email matches shared invitee",
    secondInvitation.email,
    sharedEmail,
  );
  TestValidator.equals(
    "first invitation belongs to first organization",
    firstInvitation.organization.id,
    firstOrganization.id,
  );
  TestValidator.equals(
    "second invitation belongs to second organization",
    secondInvitation.organization.id,
    secondOrganization.id,
  );
  TestValidator.equals(
    "first invitation unresolved acceptance",
    firstInvitation.accepted_at,
    null,
  );
  TestValidator.equals(
    "second invitation unresolved acceptance",
    secondInvitation.accepted_at,
    null,
  );
  TestValidator.equals(
    "first invitation unresolved finalization",
    firstInvitation.resolved_at,
    null,
  );
  TestValidator.equals(
    "second invitation unresolved finalization",
    secondInvitation.resolved_at,
    null,
  );
  TestValidator.equals(
    "first invitation not cancelled",
    firstInvitation.cancelled_at,
    null,
  );
  TestValidator.equals(
    "second invitation not cancelled",
    secondInvitation.cancelled_at,
    null,
  );
  TestValidator.equals(
    "first invitation not deleted at creation",
    firstInvitation.deleted_at,
    null,
  );
  TestValidator.equals(
    "second invitation not deleted at creation",
    secondInvitation.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "separate invitations have different identifiers",
    firstInvitation.id,
    secondInvitation.id,
  );
  await api.functional.hrmTimeTracking.owner.organizations.invitations.erase(
    ownerConnection,
    {
      organizationId: firstOrganization.id,
      invitationId: firstInvitation.id,
    },
  );
  await api.functional.hrmTimeTracking.owner.organizations.invitations.erase(
    ownerConnection,
    {
      organizationId: secondOrganization.id,
      invitationId: secondInvitation.id,
    },
  );
}
