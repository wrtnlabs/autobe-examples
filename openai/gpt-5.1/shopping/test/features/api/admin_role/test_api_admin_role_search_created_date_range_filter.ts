import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRole";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

export async function test_api_admin_role_search_created_date_range_filter(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context (SDK sets Authorization)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Let backend derive ip or send null explicitly within allowed union
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two distinct admin roles
  const role1Body = {
    code: `e2e_created_range_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const role1: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: role1Body,
    });
  typia.assert<IShoppingMallAdminRole>(role1);

  const role2Body = {
    code: `e2e_created_range_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const role2: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: role2Body,
    });
  typia.assert<IShoppingMallAdminRole>(role2);

  // Determine earlier and later roles by created_at timestamp (lexicographical compare for ISO strings)
  const role1Created = role1.created_at;
  const role2Created = role2.created_at;

  let earlierRole: IShoppingMallAdminRole = role1;
  let laterRole: IShoppingMallAdminRole = role2;

  if (role2Created < role1Created) {
    earlierRole = role2;
    laterRole = role1;
  }

  const earlierCreatedAt = earlierRole.created_at;
  const laterCreatedAt = laterRole.created_at;

  // Common pagination configuration
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  // 3a. Query range that should include only the earlier role
  const singleRangeRequest = {
    page,
    limit,
    search: null,
    code: null,
    name: null,
    is_system: null,
    created_from: earlierCreatedAt,
    created_to: earlierCreatedAt,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallAdminRole.IRequest;

  const singleRangePage: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: singleRangeRequest,
    });
  typia.assert<IPageIShoppingMallAdminRole.ISummary>(singleRangePage);

  const singleIds = singleRangePage.data.map((r) => r.id);

  if (earlierCreatedAt === laterCreatedAt) {
    // Edge case: both roles share identical created_at; both should appear
    TestValidator.predicate(
      "when created_at is equal, both roles are included in single-range search",
      singleIds.includes(role1.id) && singleIds.includes(role2.id),
    );
  } else {
    TestValidator.equals(
      "single-range search returns exactly one role",
      singleIds.length,
      1,
    );
    TestValidator.equals(
      "single-range search returns earlier role id",
      singleIds[0],
      earlierRole.id,
    );
  }

  TestValidator.equals(
    "single-range pagination.records matches data length",
    singleRangePage.pagination.records,
    singleRangePage.data.length,
  );
  TestValidator.equals(
    "single-range pagination.current is 1",
    singleRangePage.pagination.current,
    1,
  );
  TestValidator.equals(
    "single-range pagination.limit equals requested limit",
    singleRangePage.pagination.limit,
    limit,
  );

  // 3b. Query range including both roles
  const bothRangeRequest = {
    page,
    limit,
    search: null,
    code: null,
    name: null,
    is_system: null,
    created_from: earlierCreatedAt,
    created_to: laterCreatedAt,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallAdminRole.IRequest;

  const bothRangePage: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: bothRangeRequest,
    });
  typia.assert<IPageIShoppingMallAdminRole.ISummary>(bothRangePage);

  const bothIds = bothRangePage.data.map((r) => r.id);

  TestValidator.predicate(
    "both-range search includes earlier role",
    bothIds.includes(earlierRole.id),
  );
  TestValidator.predicate(
    "both-range search includes later role",
    bothIds.includes(laterRole.id),
  );

  // 3c. Query far-future date range that should match no roles
  const farFuture = "2999-01-01T00:00:00.000Z" as string &
    tags.Format<"date-time">;

  const emptyRangeRequest = {
    page,
    limit,
    search: null,
    code: null,
    name: null,
    is_system: null,
    created_from: farFuture,
    created_to: farFuture,
    order_by: "created_at",
    order_direction: "asc",
  } satisfies IShoppingMallAdminRole.IRequest;

  const emptyRangePage: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: emptyRangeRequest,
    });
  typia.assert<IPageIShoppingMallAdminRole.ISummary>(emptyRangePage);

  TestValidator.equals(
    "empty-range search returns no roles",
    emptyRangePage.data.length,
    0,
  );
  TestValidator.equals(
    "empty-range pagination.records is zero",
    emptyRangePage.pagination.records,
    0,
  );
}
