import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_customers_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup via authorize_admin_join utility
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test basic listing with default sorting (createdAt ascending)
  const basicResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(basicResponse);
  // Validate basic response structure
  TestValidator.equals(
    "pagination current page",
    basicResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit exists",
    () => basicResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count",
    () => basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculation",
    () =>
      basicResponse.pagination.pages >=
      Math.ceil(
        basicResponse.pagination.records / basicResponse.pagination.limit,
      ),
  );
  TestValidator.predicate("data array exists", () =>
    Array.isArray(basicResponse.data),
  );
  TestValidator.predicate(
    "data array count within limit",
    () => basicResponse.data.length <= basicResponse.pagination.limit,
  );
  // Validate customer summary fields
  if (basicResponse.data.length > 0) {
    const sampleCustomer = basicResponse.data[0];
    TestValidator.predicate(
      "customer has valid id",
      () => sampleCustomer.id.length > 0,
    );
    TestValidator.predicate(
      "customer has email",
      () => sampleCustomer.email.length > 0,
    );
    TestValidator.predicate(
      "customer has display_name",
      () => sampleCustomer.display_name.length > 0,
    );
    TestValidator.predicate(
      "customer has is_banned boolean",
      () => typeof sampleCustomer.is_banned === "boolean",
    );
    TestValidator.predicate(
      "customer has created_at",
      () => sampleCustomer.created_at.length > 0,
    );
  }
  // 3. Test sorting by createdAt descending
  const sortDescResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        sortOrder: "createdAt",
        sortOrderDirection: "desc",
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(sortDescResponse);
  // Verify sorting order for createdAt desc
  if (sortDescResponse.data.length > 1) {
    for (let i = 1; i < sortDescResponse.data.length; i++) {
      TestValidator.predicate(
        `createdAt desc: index ${i} should be <= index ${i - 1}`,
        () =>
          sortDescResponse.data[i].created_at <=
          sortDescResponse.data[i - 1].created_at,
      );
    }
  }
  // 4. Test sorting by createdAt ascending
  const sortAscResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        sortOrder: "createdAt",
        sortOrderDirection: "asc",
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(sortAscResponse);
  // Verify sorting order for createdAt asc
  if (sortAscResponse.data.length > 1) {
    for (let i = 1; i < sortAscResponse.data.length; i++) {
      TestValidator.predicate(
        `createdAt asc: index ${i} should be >= index ${i - 1}`,
        () =>
          sortAscResponse.data[i].created_at >=
          sortAscResponse.data[i - 1].created_at,
      );
    }
  }
  // 5. Test sorting by email ascending
  const sortEmailResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        sortOrder: "email",
        sortOrderDirection: "asc",
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(sortEmailResponse);
  // Verify email sorting order
  if (sortEmailResponse.data.length > 1) {
    for (let i = 1; i < sortEmailResponse.data.length; i++) {
      TestValidator.predicate(
        `email asc: index ${i} should be >= index ${i - 1}`,
        () =>
          sortEmailResponse.data[i].email >=
          sortEmailResponse.data[i - 1].email,
      );
    }
  }
  // 6. Test sorting by displayName descending
  const sortDisplayResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        sortOrder: "displayName",
        sortOrderDirection: "desc",
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(sortDisplayResponse);
  // Verify displayName sorting order
  if (sortDisplayResponse.data.length > 1) {
    for (let i = 1; i < sortDisplayResponse.data.length; i++) {
      TestValidator.predicate(
        `displayName desc: index ${i} should be <= index ${i - 1}`,
        () =>
          sortDisplayResponse.data[i].display_name <=
          sortDisplayResponse.data[i - 1].display_name,
      );
    }
  }
  // 7. Test pagination metadata with page 2
  const page2Response =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        page: 2,
        limit: 2,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(page2Response);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 2);
  TestValidator.equals(
    "page 2 pagination total records matches",
    page2Response.pagination.records,
    basicResponse.pagination.records,
  );
  TestValidator.predicate(
    "page 2 records count appropriate",
    () => page2Response.data.length <= page2Response.pagination.limit,
  );
  // 8. Test name filter (partial match on display_name)
  const nameFilterResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        name: "test",
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(nameFilterResponse);
  TestValidator.predicate(
    "name filter pagination exists",
    () => nameFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "name filter data count",
    () => nameFilterResponse.data.length >= 0,
  );
  // 9. Test email filter
  const emailFilterResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(emailFilterResponse);
  TestValidator.predicate(
    "email filter pagination exists",
    () => emailFilterResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "email filter data count",
    () => emailFilterResponse.data.length >= 0,
  );
  // 10. Test status filter - active customers (false)
  const activeFilterResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        status: false, // false = active
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(activeFilterResponse);
  // Validate active filter results
  if (activeFilterResponse.data.length > 0) {
    for (const customer of activeFilterResponse.data) {
      // TestValidator.equals already validates - no if-continue needed
      TestValidator.equals(
        "active filter: is_banned should be false",
        customer.is_banned,
        false,
      );
    }
  }
  // 11. Test status filter - banned customers (true)
  const bannedFilterResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        status: true, // true = banned
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(bannedFilterResponse);
  // Validate banned filter results
  if (bannedFilterResponse.data.length > 0) {
    for (const customer of bannedFilterResponse.data) {
      TestValidator.equals(
        "banned filter: is_banned should be true",
        customer.is_banned,
        true,
      );
    }
  }
  // 12. Test status filter - null (all customers)
  const statusAllResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        status: null,
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(statusAllResponse);
  TestValidator.equals(
    "status all pagination records matches basic",
    statusAllResponse.pagination.records,
    basicResponse.pagination.records,
  );
  // 13. Test registration date range filter
  const todayDate = new Date();
  const thirtyDaysAgo = new Date(
    todayDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  );
  const dateRangeFilterResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        registrationDateRange: {
          startAt: thirtyDaysAgo.toISOString(),
          endAt: todayDate.toISOString(),
        },
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(dateRangeFilterResponse);
  // Validate date range results
  if (dateRangeFilterResponse.data.length > 0) {
    for (const customer of dateRangeFilterResponse.data) {
      const createdDate = new Date(customer.created_at);
      const startDate = new Date(thirtyDaysAgo);
      const endDate = new Date(todayDate);
      TestValidator.predicate(
        "registration date within range: created_at >= startAt",
        () => createdDate.getTime() >= startDate.getTime(),
      );
      TestValidator.predicate(
        "registration date within range: created_at <= endAt",
        () => createdDate.getTime() <= endDate.getTime(),
      );
    }
  }
  // 14. Test combined filters (sort + limit)
  const combinedFilterResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        sortOrder: "createdAt",
        sortOrderDirection: "desc",
        limit: 50,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(combinedFilterResponse);
  // Validate combined filter response
  TestValidator.equals(
    "combined filter pagination current",
    combinedFilterResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined filter data count within limit",
    () =>
      combinedFilterResponse.data.length <=
      combinedFilterResponse.pagination.limit,
  );
  // Validate sorting in combined response
  if (combinedFilterResponse.data.length > 1) {
    for (let i = 1; i < combinedFilterResponse.data.length; i++) {
      TestValidator.predicate(
        "combined filter: createdAt desc valid",
        () =>
          combinedFilterResponse.data[i].created_at <=
          combinedFilterResponse.data[i - 1].created_at,
      );
    }
  }
  // 15. Test limit variation
  const smallLimitResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        limit: 5,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(smallLimitResponse);
  TestValidator.equals(
    "small limit pagination limit",
    smallLimitResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "small limit data count <= limit",
    () => smallLimitResponse.data.length <= smallLimitResponse.pagination.limit,
  );
  const maxLimitResponse =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit pagination limit",
    maxLimitResponse.pagination.limit,
    100,
  );
}
