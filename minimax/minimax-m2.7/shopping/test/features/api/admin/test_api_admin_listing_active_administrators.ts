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

export async function test_api_admin_listing_active_administrators(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a paginated list of active administrator accounts
  // Verifies: authentication required, pagination metadata, admin summary fields,
  // active accounts only (deleted_at is null), password hashes never exposed
  // 1. Create an admin to ensure there's at least one record
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!@#" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
    },
  });
  // 2. Test: Request without authentication should fail
  await TestValidator.error("unauthenticated request should fail", async () => {
    const unauthenticatedConnection: api.IConnection = {
      host: connection.host,
    };
    await api.functional.ecommerceMall.admin.admins.index(
      unauthenticatedConnection,
      {
        body: {} satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  });
  // 3. Test: Successful retrieval of active administrators
  const response = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(response);
  // Verify pagination metadata structure
  TestValidator.predicate(
    "response has pagination metadata",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    "current" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has limit",
    "limit" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has records count",
    "records" in response.pagination,
  );
  TestValidator.predicate(
    "pagination has pages count",
    "pages" in response.pagination,
  );
  // Verify data is an array
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Verify at least one admin exists (the one we just created)
  TestValidator.predicate("has at least one admin", response.data.length >= 1);
  // Verify admin summary fields in the response
  const admin = response.data[0];
  TestValidator.predicate(
    "admin has id (uuid)",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin.id,
    ),
  );
  TestValidator.predicate(
    "admin has email",
    admin.email !== undefined && admin.email.includes("@"),
  );
  TestValidator.predicate(
    "admin has name",
    typeof admin.name === "string" && admin.name.length > 0,
  );
  TestValidator.predicate(
    "admin has created_at",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(admin.created_at),
  );
  TestValidator.predicate(
    "admin has updated_at",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(admin.updated_at),
  );
  TestValidator.predicate(
    "admin has deleted_at",
    admin.deleted_at !== undefined,
  );
  // Verify active accounts only (deleted_at should be null for default query)
  TestValidator.equals(
    "deleted_at is null for active accounts",
    admin.deleted_at,
    null,
  );
  // Verify password_hash is NOT exposed in response
  TestValidator.predicate(
    "password_hash not exposed",
    !("password_hash" in admin),
  );
  TestValidator.predicate("password not exposed", !("password" in admin));
  // 4. Test with pagination parameters
  const paginatedResponse =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "page 1 returns correct current",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    paginatedResponse.pagination.limit,
    10,
  );
  // 5. Test with search filter
  const searchResponse = await api.functional.ecommerceMall.admin.admins.index(
    adminConnection,
    {
      body: {
        search: admin.name.substring(0, 3),
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Verify search returns matching results
  if (searchResponse.data.length > 0) {
    const found = searchResponse.data.some((a) =>
      a.name.includes(admin.name.substring(0, 3)),
    );
    TestValidator.predicate("search filter works", found);
  }
  // 6. Test with status filter explicitly set to 'active'
  const activeStatusResponse =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        status: "active",
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(activeStatusResponse);
  // All returned admins should have deleted_at as null
  for (const adminItem of activeStatusResponse.data) {
    TestValidator.equals(
      "active status filter returns only active admins",
      adminItem.deleted_at,
      null,
    );
  }
}
