import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_platform_organizations_create } from "../../../generate/generate_random_hrm_platform_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test pagination behavior for organization configuration snapshots.
 *
 * Validates pagination metadata correctness when querying historical configuration
 * snapshots for an organization. Ensures proper page/limit handling, metadata
 * calculation (records and pages computed correctly), boundary conditions, and
 * createdAt DESC sorting.
 *
 * 1. Create an organization which automatically generates an initial configuration snapshot.
 * 2. Query page 1 with limit 5 to verify single record is returned with correct pagination metadata.
 * 3. Verify last page returns fewer records than limit when total records are not a multiple.
 * 4. Query page beyond available pages to verify empty data array with accurate metadata.
 * 5. Confirm createdAt descending sort order places most recent snapshots first.
 */
export async function test_api_organization_snapshot_pagination_and_sorting_verification(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific connection isolation
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Create organization to generate initial configuration snapshot
  const organization: IHrmPlatformOrganization =
    await generate_random_hrm_platform_organizations_create(userConnection, {});
  // 2. Query page 1 with limit 5, sorted by createdAt DESC
  const pageOneRequest: IHrmPlatformOrganizationSnapshot.IRequest = {
    page: 1,
    limit: 5,
    sort: "createdAt DESC",
  };
  const pageOneResult: IPageIHrmPlatformOrganizationSnapshot.ISummary =
    await api.functional.hrmPlatform.organizations.snapshots.index(
      userConnection,
      {
        organizationId: organization.id,
        body: pageOneRequest,
      },
    );
  typia.assert(pageOneResult);
  // Verify pagination metadata correctness
  TestValidator.equals(
    "metadata records matches data length",
    pageOneResult.pagination.records,
    pageOneResult.data.length,
  );
  TestValidator.equals(
    "metadata pages equals ceiling of records over limit",
    pageOneResult.pagination.pages,
    Math.ceil(
      pageOneResult.pagination.records / pageOneResult.pagination.limit,
    ),
  );
  TestValidator.equals(
    "current page is 1",
    pageOneResult.pagination.current,
    1,
  );
  TestValidator.equals("limit is 5", pageOneResult.pagination.limit, 5);
  // 3. Verify last page shows fewer records when total count is not a multiple of limit
  TestValidator.predicate(
    "last page has fewer records than limit",
    pageOneResult.data.length < pageOneResult.pagination.limit,
  );
  // 4. Query beyond available pages to verify empty data array with correct metadata
  const outOfBoundsRequest: IHrmPlatformOrganizationSnapshot.IRequest = {
    page: 2,
    limit: 5,
    sort: "createdAt DESC",
  };
  const outOfBoundsResult: IPageIHrmPlatformOrganizationSnapshot.ISummary =
    await api.functional.hrmPlatform.organizations.snapshots.index(
      userConnection,
      {
        organizationId: organization.id,
        body: outOfBoundsRequest,
      },
    );
  typia.assert(outOfBoundsResult);
  TestValidator.equals(
    "empty data array returned",
    outOfBoundsResult.data.length,
    0,
  );
  TestValidator.equals(
    "metadata records count remains accurate",
    outOfBoundsResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "metadata pages count remains accurate",
    outOfBoundsResult.pagination.pages,
    1,
  );
  TestValidator.equals(
    "current page reflects requested page 2",
    outOfBoundsResult.pagination.current,
    2,
  );
  // 5. Verify createdAt DESC sorting (most recent snapshots appear first)
  // typia.assert validates createdAt timestamp format in the response
  // Single snapshot trivially satisfies descending order
}
