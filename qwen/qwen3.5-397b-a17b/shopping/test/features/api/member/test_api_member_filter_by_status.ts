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
 * Test administrator filtering member accounts by status to monitor banned or deleted users.
 *
 * Validates the complete member status filtering workflow including administrator authentication and status-based filtering for banned, deleted, and active accounts. Ensures that the status filter performs exact matching and correctly excludes members with other statuses.
 *
 * Special attention is given to verifying that banned members are correctly identified for administrative oversight, deleted (soft-deleted) members remain queryable for legal and order record purposes, and active accounts are properly returned when filtered.
 *
 * 1. Administrator authenticates via authorize_admin_join utility function.
 * 2. Administrator calls PATCH /shoppingMall/admin/members with status filter set to 'banned'.
 * 3. Verify response contains ONLY members with status='banned'.
 * 4. Repeat test with status='deleted' to verify soft-deleted accounts are filterable.
 * 5. Repeat test with status='active' to verify active accounts are returned.
 * 6. Validate that filtering by status correctly excludes members with other statuses.
 */
export async function test_api_member_filter_by_status(
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
  // 2. Test filtering by status='banned'
  const bannedResult = await api.functional.shoppingMall.admin.members.index(
    adminConnection,
    {
      body: {
        status: "banned",
      } satisfies IShoppingMallMember.IRequest,
    },
  );
  typia.assert(bannedResult);
  // Validate all returned members have status='banned'
  for (const member of bannedResult.data) {
    TestValidator.equals("banned member status", member.status, "banned");
  }
  // 3. Test filtering by status='deleted'
  const deletedResult = await api.functional.shoppingMall.admin.members.index(
    adminConnection,
    {
      body: {
        status: "deleted",
      } satisfies IShoppingMallMember.IRequest,
    },
  );
  typia.assert(deletedResult);
  // Validate all returned members have status='deleted'
  for (const member of deletedResult.data) {
    TestValidator.equals("deleted member status", member.status, "deleted");
  }
  // 4. Test filtering by status='active'
  const activeResult = await api.functional.shoppingMall.admin.members.index(
    adminConnection,
    {
      body: {
        status: "active",
      } satisfies IShoppingMallMember.IRequest,
    },
  );
  typia.assert(activeResult);
  // Validate all returned members have status='active'
  for (const member of activeResult.data) {
    TestValidator.equals("active member status", member.status, "active");
  }
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "banned pagination valid",
    bannedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "deleted pagination valid",
    deletedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "active pagination valid",
    activeResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "banned records count matches data",
    bannedResult.pagination.records >= bannedResult.data.length,
  );
  TestValidator.predicate(
    "deleted records count matches data",
    deletedResult.pagination.records >= deletedResult.data.length,
  );
  TestValidator.predicate(
    "active records count matches data",
    activeResult.pagination.records >= activeResult.data.length,
  );
}
