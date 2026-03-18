import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
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

export async function test_api_organization_owner_browse_excludes_deleted_workspaces(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/owners/join",
      referrer: "https://example.com/owners",
    },
  });
  typia.assert(owner);
  const token = RandomGenerator.alphaNumeric(16);
  const sharedDescription = `organization-browse-${token}`;
  const activeOrganizationName = `active-${token}`;
  const deletedOrganizationName = `deleted-${token}`;
  const activeOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: activeOrganizationName,
          description: sharedDescription,
          logo_uri: "https://example.com/logo-active",
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(activeOrganization);
  const removableOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: deletedOrganizationName,
          description: sharedDescription,
          logo_uri: "https://example.com/logo-deleted",
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(removableOrganization);
  await api.functional.hrmTimeTracking.owner.organizations.erase(
    ownerConnection,
    {
      organizationId: removableOrganization.id,
    },
  );
  const page = await api.functional.hrmTimeTracking.owners.index(
    ownerConnection,
    {
      body: {
        search: token,
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(page);
  const activeSummary = page.data.find(
    (organization) => organization.id === activeOrganization.id,
  );
  const deletedSummary = page.data.find(
    (organization) => organization.id === removableOrganization.id,
  );
  TestValidator.predicate(
    "active organization remains visible in owner browse results",
    activeSummary !== undefined,
  );
  TestValidator.equals(
    "active organization id matches created organization",
    activeSummary?.id,
    activeOrganization.id,
  );
  TestValidator.equals(
    "active organization name matches created organization",
    activeSummary?.name,
    activeOrganization.name,
  );
  TestValidator.equals(
    "deleted organization is absent from active browse results",
    deletedSummary,
    undefined,
  );
  TestValidator.predicate(
    "all returned organizations exclude the deleted organization",
    page.data.every(
      (organization) => organization.id !== removableOrganization.id,
    ),
  );
  TestValidator.equals(
    "unique search returns only the remaining active organization",
    page.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination records count excludes deleted organization",
    page.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages count reflects single active result",
    page.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination records equals returned active results for unique search",
    page.pagination.records,
    page.data.length,
  );
}
