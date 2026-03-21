import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_listing_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin accounts for testing search and filter functionality
  // Admin 1: Primary test subject with distinct email and name
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: `admin.search1.${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "TestPassword123!" as string & typia.tags.Format<"password">,
      name: `SearchAdmin One ${RandomGenerator.alphaNumeric(4)}`,
      href: "http://localhost:3000/test",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(admin1);
  // Admin 2: Second test subject with different email and name
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: `admin.search2.${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "TestPassword123!" as string & typia.tags.Format<"password">,
      name: `SearchAdmin Two ${RandomGenerator.alphaNumeric(4)}`,
      href: "http://localhost:3000/test",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(admin2);
  // Admin 3: Third test subject with partial matching in email and name
  const adminConnection3: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_join(adminConnection3, {
    body: {
      email: `unique.marker.${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "TestPassword123!" as string & typia.tags.Format<"password">,
      name: `UniqueMarkerName ${RandomGenerator.alphaNumeric(4)}`,
      href: "http://localhost:3000/test",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(admin3);
  // Test 1: Get all admins with no filters (verify ordering by created_at descending)
  const allAdminsResult = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection1,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(allAdminsResult);
  // Verify pagination structure
  TestValidator.equals(
    "pagination exists",
    allAdminsResult.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "has records",
    allAdminsResult.pagination.records >= 3,
  );
  TestValidator.predicate("has data", allAdminsResult.data.length >= 3);
  // Verify ordering - newest created admin should be first (admin3 was created last)
  TestValidator.equals(
    "newest admin is first",
    allAdminsResult.data[0].id,
    admin3.id,
  );
  // Test 2: Filter by email partial match (case-insensitive)
  const emailPrefix = admin1.email.split("@")[0].substring(0, 8);
  const emailFilterResult =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection1, {
      body: {
        email: emailPrefix,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(emailFilterResult);
  // Verify email filter worked - all results should have matching email
  for (const admin of emailFilterResult.data) {
    TestValidator.predicate(
      `email contains filter "${emailPrefix}"`,
      admin.email.toLowerCase().includes(emailPrefix.toLowerCase()),
    );
  }
  // Test 3: Filter by name partial match (case-insensitive)
  const nameSearchPart = admin2.name.split(" ")[1]; // Get middle part of name
  const nameFilterResult =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection1, {
      body: {
        name: nameSearchPart,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(nameFilterResult);
  // Verify name filter worked - all results should have matching name
  for (const admin of nameFilterResult.data) {
    TestValidator.predicate(
      `name contains filter "${nameSearchPart}"`,
      admin.name.toLowerCase().includes(nameSearchPart.toLowerCase()),
    );
  }
  // Test 4: General search field (searches both email and name)
  const uniqueMarker = "unique.marker";
  const searchResult = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection1,
    {
      body: {
        search: uniqueMarker,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(searchResult);
  // Verify general search - should find admin3 with unique marker in email or name
  TestValidator.predicate(
    "search finds admin with unique marker",
    searchResult.data.some((admin) => admin.id === admin3.id),
  );
  // Test 5: Pagination - limit parameter
  const limitedResult = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection1,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(limitedResult);
  // Verify limit was respected
  TestValidator.predicate("limit is respected", limitedResult.data.length <= 2);
  TestValidator.equals(
    "pagination limit matches request",
    limitedResult.pagination.limit,
    2,
  );
  // Test 6: Pagination - page parameter
  if (limitedResult.pagination.pages > 1) {
    const secondPageResult =
      await api.functional.ecommerceMall.admin.admins.index(adminConnection1, {
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceMallAdmin.IRequest,
      });
    typia.assert(secondPageResult);
    // Verify different data on second page
    TestValidator.predicate(
      "second page has different data",
      secondPageResult.data[0]?.id !== limitedResult.data[0]?.id,
    );
    TestValidator.equals(
      "second page current value",
      secondPageResult.pagination.current,
      2,
    );
  }
  // Test 7: Combine email and name filters
  const combinedFilterResult =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection1, {
      body: {
        email: admin1.email.split("@")[0].substring(0, 5),
        name: admin1.name.split(" ")[0],
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(combinedFilterResult);
  // Verify combined filters - admin1 should be in results
  const foundAdmin1 = combinedFilterResult.data.find((a) => a.id === admin1.id);
  TestValidator.equals(
    "combined filters find correct admin",
    foundAdmin1 !== undefined,
    true,
  );
  TestValidator.equals("email matches", foundAdmin1!.email, admin1.email);
  TestValidator.equals("name matches", foundAdmin1!.name, admin1.name);
  // Test 8: Verify all admin summaries have required fields
  for (const adminSummary of allAdminsResult.data) {
    typia.assert(adminSummary);
    TestValidator.predicate(
      "has valid uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        adminSummary.id,
      ),
    );
    TestValidator.predicate("has email", adminSummary.email.includes("@"));
    TestValidator.predicate("has name", adminSummary.name.length > 0);
    TestValidator.predicate("has created_at", adminSummary.created_at !== null);
    TestValidator.predicate("has updated_at", adminSummary.updated_at !== null);
  }
}
