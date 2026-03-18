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

export async function test_api_organization_invitation_review_pending_list(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OwnerTest1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const organization =
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
        },
      },
    );
  typia.assert(organization);
  const request = {
    page: 1,
    limit: 10,
    status: "pending",
    sort: "+invited_at",
  } satisfies IHrmTimeTrackingOrganizationInvitation.IRequest;
  const result =
    await api.functional.hrmTimeTracking.owner.organizations.invitations.index(
      ownerConnection,
      {
        organizationId: organization.id,
        body: request,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "pagination current page matches request",
    result.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed page limit",
    result.data.length <= result.pagination.limit,
  );
  for (const invitation of result.data) {
    TestValidator.equals(
      "invitation remains pending under pending filter",
      invitation.status,
      "pending",
    );
    TestValidator.equals(
      "pending invitation has no acceptance timestamp",
      invitation.accepted_at,
      null,
    );
    TestValidator.equals(
      "pending invitation has no resolution timestamp",
      invitation.resolved_at,
      null,
    );
    TestValidator.equals(
      "pending invitation has no expiration timestamp",
      invitation.expired_at,
      null,
    );
    TestValidator.equals(
      "pending invitation has no cancellation timestamp",
      invitation.cancelled_at,
      null,
    );
    TestValidator.predicate(
      "invited email is exposed for onboarding review",
      invitation.email.length > 0,
    );
    if (invitation.role !== null) {
      TestValidator.equals(
        "role organization stays within requested tenant",
        invitation.role.organization.id,
        organization.id,
      );
    }
  }
}
