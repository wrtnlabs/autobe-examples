import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMember";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of paginated customer member list.
 *
 * Validates the complete member listing workflow including administrator authentication, paginated member retrieval, and response structure validation. Ensures that the member summary data includes all required fields while excluding sensitive information like password_hash.
 *
 * Special attention is given to verifying that customer profile information is properly joined and included in the response, and that pagination metadata accurately reflects the total record count and page information.
 *
 * 1. Administrator account is created and authenticated using authorize_admin_join utility.
 * 2. Administrator calls PATCH /shoppingMall/admin/members with default pagination parameters.
 * 3. Validates response structure matches IPageIShoppingMallMember.ISummary schema.
 * 4. Verifies each member record contains required fields: id, email, status, created_at, customerProfile.
 * 5. Confirms pagination metadata includes current page, limit, total records, and total pages.
 * 6. Validates customer profile contains display_name and phone_number when available.
 */
export async function test_api_member_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve member list with default pagination
  const memberList = await api.functional.shoppingMall.admin.members.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallMember.IRequest,
    },
  );
  typia.assert(memberList);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", memberList.pagination.current, 1);
  TestValidator.equals("limit", memberList.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    memberList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    memberList.pagination.pages >= 0,
  );
  // 4. Validate data is array
  TestValidator.predicate("data is array", Array.isArray(memberList.data));
  // 5. Validate sorting (created_at descending - newest first)
  if (memberList.data.length > 1) {
    for (let i = 0; i < memberList.data.length - 1; i++) {
      const current = new Date(memberList.data[i].created_at).getTime();
      const next = new Date(memberList.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `sorted by created_at descending (index ${i})`,
        current >= next,
      );
    }
  }
  // 6. Validate customer profile structure when present (business logic, not type)
  for (const member of memberList.data) {
    if (member.customerProfile !== null) {
      TestValidator.predicate(
        "customerProfile has display_name",
        member.customerProfile.display_name.length > 0,
      );
      TestValidator.predicate(
        "customerProfile has phone_number",
        member.customerProfile.phone_number.length > 0,
      );
    }
  }
}
