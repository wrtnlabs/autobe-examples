import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationInvitation";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganizationInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_organization_invitation_review_separate_by_organization(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/owners/join",
      referrer: "https://example.com/owners",
    },
  });
  const targetOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `target-${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: "https://example.com/assets/logo-target.png",
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(targetOrganization);
  const otherOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `other-${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: "https://example.com/assets/logo-other.png",
          currency_code: "USD",
          timezone: "UTC",
          fiscal_start_month: 2,
        },
      },
    );
  typia.assert(otherOrganization);
  TestValidator.notEquals(
    "organizations must be different",
    targetOrganization.id,
    otherOrganization.id,
  );
  const sharedEmail = typia.random<string & tags.Format<"email">>();
  const request = {
    email: sharedEmail,
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingOrganizationInvitation.IRequest;
  const reviewed =
    await api.functional.hrmTimeTracking.owner.organizations.invitations.index(
      ownerConnection,
      {
        organizationId: targetOrganization.id,
        body: request,
      },
    );
  typia.assert(reviewed);
  TestValidator.equals(
    "pagination current page matches request",
    reviewed.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    reviewed.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "returned data length does not exceed limit",
    reviewed.data.length <= reviewed.pagination.limit,
  );
  TestValidator.predicate(
    "records cover returned data length",
    reviewed.pagination.records >= reviewed.data.length,
  );
  TestValidator.predicate("pages non-negative", reviewed.pagination.pages >= 0);
  for (const invitation of reviewed.data) {
    TestValidator.equals(
      "filtered invitation email matches shared email",
      invitation.email,
      sharedEmail,
    );
    if (invitation.role !== null) {
      TestValidator.equals(
        "nested role organization stays in target organization",
        invitation.role.organization.id,
        targetOrganization.id,
      );
      TestValidator.notEquals(
        "nested role organization must not leak other organization",
        invitation.role.organization.id,
        otherOrganization.id,
      );
    }
  }
}
