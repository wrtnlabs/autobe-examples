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

export async function test_api_organization_owner_browse_isolated_by_ownership(
  connection: api.IConnection,
): Promise<void> {
  const sharedSearchToken: string = `isolated-${RandomGenerator.alphabets(8)}`;
  const primaryOwnerConnection: api.IConnection = { host: connection.host };
  const primaryOwnerAuth = await authorize_owner_join(primaryOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/owners/join/primary",
      referrer: "https://example.com/owners",
    },
  });
  typia.assert(primaryOwnerAuth);
  const primaryOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      primaryOwnerConnection,
      {
        body: {
          name: `${sharedSearchToken} ${RandomGenerator.name(2)}`,
          description: `${sharedSearchToken} ${RandomGenerator.paragraph({ sentences: 3 })}`,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 3,
          logo_uri: "https://example.com/logo-primary",
        },
      },
    );
  typia.assert(primaryOrganization);
  const unrelatedOwnerConnection: api.IConnection = { host: connection.host };
  const unrelatedOwnerAuth = await authorize_owner_join(
    unrelatedOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/owners/join/unrelated",
        referrer: "https://example.com/owners",
      },
    },
  );
  typia.assert(unrelatedOwnerAuth);
  const unrelatedOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      unrelatedOwnerConnection,
      {
        body: {
          name: `${sharedSearchToken} ${RandomGenerator.name(2)}`,
          description: `${sharedSearchToken} ${RandomGenerator.paragraph({ sentences: 3 })}`,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 3,
          logo_uri: "https://example.com/logo-unrelated",
        },
      },
    );
  typia.assert(unrelatedOrganization);
  const browseRequest = {
    search: sharedSearchToken,
    page: 1,
    limit: 100,
    name: sharedSearchToken,
    description: sharedSearchToken,
    currency_code: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: 3,
  } satisfies IHrmTimeTrackingOrganization.IRequest;
  const primaryBrowse = await api.functional.hrmTimeTracking.owners.index(
    primaryOwnerConnection,
    {
      body: browseRequest,
    },
  );
  typia.assert(primaryBrowse);
  TestValidator.predicate(
    "primary owner can browse own organization",
    ArrayUtil.has(
      primaryBrowse.data,
      (organization) => organization.id === primaryOrganization.id,
    ),
  );
  TestValidator.predicate(
    "primary owner never sees unrelated owner organization",
    !ArrayUtil.has(
      primaryBrowse.data,
      (organization) => organization.id === unrelatedOrganization.id,
    ),
  );
  TestValidator.predicate(
    "all browsed organizations are reachable through primary ownership linkage",
    primaryBrowse.data.every(
      (organization) => organization.id === primaryOrganization.id,
    ),
  );
  TestValidator.predicate(
    "returned organization preserves requested shared filter values",
    primaryBrowse.data.every(
      (organization) =>
        organization.currency_code === "USD" &&
        organization.timezone === "Asia/Seoul" &&
        organization.fiscal_start_month === 3 &&
        organization.name.includes(sharedSearchToken),
    ),
  );
  const isolatedOwnerWithoutOrganizationConnection: api.IConnection = {
    host: connection.host,
  };
  const isolatedOwnerWithoutOrganizationAuth = await authorize_owner_join(
    isolatedOwnerWithoutOrganizationConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/owners/join/isolated",
        referrer: "https://example.com/owners",
      },
    },
  );
  typia.assert(isolatedOwnerWithoutOrganizationAuth);
  const emptyBrowse = await api.functional.hrmTimeTracking.owners.index(
    isolatedOwnerWithoutOrganizationConnection,
    {
      body: browseRequest,
    },
  );
  typia.assert(emptyBrowse);
  TestValidator.equals(
    "owner without ownership linkage receives empty page data",
    emptyBrowse.data.length,
    0,
  );
  TestValidator.equals(
    "owner without ownership linkage has zero records",
    emptyBrowse.pagination.records,
    0,
  );
}
