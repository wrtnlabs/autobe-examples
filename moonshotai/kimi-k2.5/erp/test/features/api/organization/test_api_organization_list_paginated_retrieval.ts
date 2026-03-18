import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_list_paginated_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member using auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  // Step 2: Call the organization index endpoint with default pagination (empty body)
  const response = await api.functional.erpHrm.member.organizations.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(response);
  // Step 3: Verify pagination defaults are applied when not specified
  TestValidator.equals(
    "pagination current defaults to 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit defaults to 20",
    response.pagination.limit,
    20,
  );
  // Step 4: Verify data array length respects pagination limit
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // Step 5: Verify data isolation - all returned organizations belong to the authenticated member
  for (const org of response.data) {
    TestValidator.equals(
      "organization owner is authenticated member",
      org.owner.id,
      authorizedMember.id,
    );
  }
  // Step 6: Verify all organizations in the list pass ownership check
  const allOrganizationsBelongToMember = response.data.every(
    (org) => org.owner.id === authorizedMember.id,
  );
  TestValidator.equals(
    "all returned organizations belong to authenticated member",
    allOrganizationsBelongToMember,
    true,
  );
}
