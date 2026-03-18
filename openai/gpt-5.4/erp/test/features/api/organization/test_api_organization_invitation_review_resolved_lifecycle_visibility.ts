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

export async function test_api_organization_invitation_review_resolved_lifecycle_visibility(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/hrm/owners/join",
      referrer: "https://example.com/hrm",
      ip: "127.0.0.1",
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(owner);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: "https://example.com/logo.png",
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const now = new Date();
  const resolvedFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const resolvedTo = new Date(
    now.getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const emailFiltered =
    await api.functional.hrmTimeTracking.owner.organizations.invitations.index(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          email: targetEmail,
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingOrganizationInvitation.IRequest,
      },
    );
  typia.assert(emailFiltered);
  TestValidator.equals(
    "email filtered current page is first page",
    emailFiltered.pagination.current,
    1,
  );
  TestValidator.equals(
    "email filtered limit matches request",
    emailFiltered.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "email filtered record count is non-negative",
    emailFiltered.pagination.records >= 0,
  );
  TestValidator.predicate(
    "email filtered page count is non-negative",
    emailFiltered.pagination.pages >= 0,
  );
  for (const invitation of emailFiltered.data) {
    TestValidator.equals(
      "email filter keeps only requested email",
      invitation.email,
      targetEmail,
    );
  }
  const pendingFiltered =
    await api.functional.hrmTimeTracking.owner.organizations.invitations.index(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          status: "pending",
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingOrganizationInvitation.IRequest,
      },
    );
  typia.assert(pendingFiltered);
  TestValidator.equals(
    "pending filtered current page is first page",
    pendingFiltered.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending filtered limit matches request",
    pendingFiltered.pagination.limit,
    100,
  );
  for (const invitation of pendingFiltered.data) {
    TestValidator.equals(
      "pending filter keeps only pending invitations",
      invitation.status,
      "pending",
    );
  }
  const resolvedFiltered =
    await api.functional.hrmTimeTracking.owner.organizations.invitations.index(
      ownerConnection,
      {
        organizationId: organization.id,
        body: {
          resolvedFrom,
          resolvedTo,
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingOrganizationInvitation.IRequest,
      },
    );
  typia.assert(resolvedFiltered);
  TestValidator.equals(
    "resolved filtered current page is first page",
    resolvedFiltered.pagination.current,
    1,
  );
  TestValidator.equals(
    "resolved filtered limit matches request",
    resolvedFiltered.pagination.limit,
    100,
  );
  for (const invitation of resolvedFiltered.data) {
    TestValidator.predicate(
      "resolved lifecycle query returns only invitations with resolved timestamp",
      invitation.resolved_at !== null,
    );
  }
  const hasOverlappingResolvedAndPendingIds = resolvedFiltered.data.some(
    (resolved) =>
      pendingFiltered.data.some((pending) => pending.id === resolved.id),
  );
  TestValidator.equals(
    "pending and resolved filtered sets do not overlap by invitation id",
    hasOverlappingResolvedAndPendingIds,
    false,
  );
  for (const invitation of resolvedFiltered.data) {
    TestValidator.notEquals(
      "resolved invitation is distinct from unresolved pending lifecycle",
      invitation.resolved_at,
      null,
    );
  }
}
