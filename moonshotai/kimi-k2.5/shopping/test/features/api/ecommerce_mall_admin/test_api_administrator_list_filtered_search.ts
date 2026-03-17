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

export async function test_api_administrator_list_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection for performing filtered searches
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Create additional administrators with unique identifiers for filtering tests
  const uniquePrefix = RandomGenerator.alphaNumeric(8);
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1Email = `${uniquePrefix}.admin1@test.com`;
  await authorize_admin_join(adminConnection1, {
    body: {
      email: admin1Email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2Email = `${uniquePrefix}.admin2@test.com`;
  await authorize_admin_join(adminConnection2, {
    body: {
      email: admin2Email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Test filtering by email partial match
  const emailFilterResult =
    await api.functional.ecommerceMall.admin.admins.index(
      superAdminConnection,
      {
        body: {
          email: `${uniquePrefix}.admin1`,
          limit: 10,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(emailFilterResult);
  TestValidator.predicate(
    "email partial filter returns matching administrators",
    emailFilterResult.data.every((admin) =>
      admin.email.includes(`${uniquePrefix}.admin1`),
    ),
  );
  // Test filtering by grade
  const gradeFilterResult =
    await api.functional.ecommerceMall.admin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "regular",
          limit: 10,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(gradeFilterResult);
  TestValidator.predicate(
    "grade filter returns only regular administrators",
    gradeFilterResult.data.every((admin) => admin.grade === "regular"),
  );
  // Test filtering by status
  const statusFilterResult =
    await api.functional.ecommerceMall.admin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "active",
          limit: 10,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(statusFilterResult);
  TestValidator.predicate(
    "status filter returns only active administrators",
    statusFilterResult.data.every((admin) => admin.status === "active"),
  );
  // Test sorting by created_at descending (newest first)
  const sortedByCreatedDesc =
    await api.functional.ecommerceMall.admin.admins.index(
      superAdminConnection,
      {
        body: {
          sort: "-created_at",
          limit: 10,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(sortedByCreatedDesc);
  for (let i = 0; i < sortedByCreatedDesc.data.length - 1; i++) {
    const currentTime = new Date(
      sortedByCreatedDesc.data[i].createdAt,
    ).getTime();
    const nextTime = new Date(
      sortedByCreatedDesc.data[i + 1].createdAt,
    ).getTime();
    TestValidator.predicate(
      `created_at descending order at index ${i}`,
      currentTime >= nextTime,
    );
  }
  // Test sorting by grade ascending
  const sortedByGradeAsc =
    await api.functional.ecommerceMall.admin.admins.index(
      superAdminConnection,
      {
        body: {
          sort: "grade",
          limit: 10,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(sortedByGradeAsc);
  // Test pagination with page parameter
  const firstPage = await api.functional.ecommerceMall.admin.admins.index(
    superAdminConnection,
    {
      body: {
        limit: 1,
        page: 1,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page respects limit",
    firstPage.data.length <= 1,
    true,
  );
  // Request second page
  const secondPage = await api.functional.ecommerceMall.admin.admins.index(
    superAdminConnection,
    {
      body: {
        limit: 1,
        page: 2,
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(secondPage);
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.notEquals(
      "second page contains different administrators than first page",
      secondPage.data[0].id,
      firstPage.data[0].id,
    );
  }
  // Test combined filters
  const combinedFilterResult =
    await api.functional.ecommerceMall.admin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "regular",
          status: "active",
          sort: "-created_at",
          limit: 10,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters return administrators matching all criteria",
    combinedFilterResult.data.every(
      (admin) => admin.grade === "regular" && admin.status === "active",
    ),
  );
}
