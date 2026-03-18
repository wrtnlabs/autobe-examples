import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_contracts_create } from "../../../generate/generate_random_erp_hrm_member_contracts_create";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

/**
 * Test cursor-based pagination for contract lists with cursor navigation validation.
 * Verifies default limit of 20 records, cursor extraction from last item, and
 * correct pagination across multiple pages with descending sort order by created_at.
 */
export async function test_api_contract_pagination_cursor_navigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to establish authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create organization for contract management context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create organization member to associate contracts with
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: member.id,
        },
      },
    );
  typia.assert(orgMember);
  // 4. Create 25 employment contracts to trigger pagination (default limit is 20)
  await ArrayUtil.asyncRepeat(25, async () => {
    const contract = await generate_random_erp_hrm_member_contracts_create(
      memberConnection,
      {
        body: {
          organization_member_id: orgMember.id,
        },
      },
    );
    typia.assert(contract);
  });
  // 5. First page request with default limit (20) and descending sort by created_at
  const firstPage = await api.functional.erpHrm.member.contracts.index(
    memberConnection,
    {
      body: {
        organizationMemberId: orgMember.id,
        limit: 20,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IErpHrmContract.IRequest,
    },
  );
  typia.assert(firstPage);
  // 6. Validate first page metadata
  TestValidator.equals("first page record count", firstPage.data.length, 20);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 20);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("total records count", firstPage.pagination.records, 25);
  TestValidator.equals("total pages", firstPage.pagination.pages, 2);
  // 7. Extract cursor from last record of first page
  const lastRecord = firstPage.data[firstPage.data.length - 1];
  const cursor = Buffer.from(
    JSON.stringify({
      created_at: lastRecord.createdAt,
      id: lastRecord.id,
    }),
  ).toString("base64");
  // 8. Second page request using cursor
  const secondPage = await api.functional.erpHrm.member.contracts.index(
    memberConnection,
    {
      body: {
        organizationMemberId: orgMember.id,
        cursor: cursor,
        limit: 20,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IErpHrmContract.IRequest,
    },
  );
  typia.assert(secondPage);
  // 9. Validate second page contains remaining contracts
  TestValidator.equals("second page record count", secondPage.data.length, 5);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals(
    "second page total records",
    secondPage.pagination.records,
    25,
  );
  // 10. Verify no duplicate records across pages
  const firstPageIds = new Set(firstPage.data.map((c) => c.id));
  const secondPageIds = secondPage.data.map((c) => c.id);
  const duplicates = secondPageIds.filter((id) => firstPageIds.has(id));
  TestValidator.equals(
    "no duplicate records across pages",
    duplicates.length,
    0,
  );
  // 11. Validate descending sort order by created_at across all records
  const allRecords = [...firstPage.data, ...secondPage.data];
  for (let i = 0; i < allRecords.length - 1; i++) {
    const current = new Date(allRecords[i].createdAt);
    const next = new Date(allRecords[i + 1].createdAt);
    TestValidator.predicate(
      `record ${i} created_at >= record ${i + 1} created_at`,
      current.getTime() >= next.getTime(),
    );
  }
}
