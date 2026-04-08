import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admins_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Retrieve paginated list with default settings (empty body)
  const defaultResponse = await api.functional.erpHrm.admins.index(connection, {
    body: {},
  });
  typia.assert(defaultResponse);
  // Validate response structure
  TestValidator.equals(
    "response has pagination",
    !!defaultResponse.pagination,
    true,
  );
  TestValidator.equals("response has data array", !!defaultResponse.data, true);
  TestValidator.equals(
    "data is array",
    Array.isArray(defaultResponse.data),
    true,
  );
  // Validate pagination metadata
  const pagination = defaultResponse.pagination;
  TestValidator.predicate(
    "current page is valid",
    typeof pagination.current === "number",
  );
  TestValidator.predicate(
    "limit is valid",
    typeof pagination.limit === "number",
  );
  TestValidator.predicate(
    "records is valid",
    typeof pagination.records === "number",
  );
  TestValidator.predicate(
    "pages is valid",
    typeof pagination.pages === "number",
  );
  // Validate each admin in data array has required fields
  for (const admin of defaultResponse.data) {
    // Verify UUID format for id
    TestValidator.predicate(
      "admin id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        admin.id,
      ),
    );
    // Verify required fields exist
    TestValidator.predicate(
      "email exists",
      typeof admin.email === "string" && admin.email.length > 0,
    );
    TestValidator.predicate(
      "displayName exists",
      typeof admin.displayName === "string" && admin.displayName.length > 0,
    );
    TestValidator.predicate(
      "createdAt exists",
      typeof admin.createdAt === "string" && admin.createdAt.length > 0,
    );
    // Verify optional fields can be null or string
    TestValidator.predicate(
      "avatarUri is string or null",
      admin.avatarUri === null || typeof admin.avatarUri === "string",
    );
    TestValidator.predicate(
      "phone is string or null or undefined",
      admin.phone === null ||
        admin.phone === undefined ||
        typeof admin.phone === "string",
    );
    // Verify password_hash is NOT present (sensitive data excluded)
    TestValidator.equals(
      "password_hash excluded from response",
      (admin as any).password_hash,
      undefined,
    );
  }
  // Verify results are sorted by created_at descending (newest first)
  if (defaultResponse.data.length > 1) {
    for (let i = 0; i < defaultResponse.data.length - 1; i++) {
      const current = new Date(defaultResponse.data[i].createdAt);
      const next = new Date(defaultResponse.data[i + 1].createdAt);
      TestValidator.predicate(
        `admin ${i} createdAt >= admin ${i + 1} createdAt`,
        current >= next,
      );
    }
  }
  // Test 2: Pagination - request page 2 with limit of 10
  const page2Response = await api.functional.erpHrm.admins.index(connection, {
    body: {
      page: 2,
      limit: 10,
    },
  });
  typia.assert(page2Response);
  // Validate pagination for page 2
  TestValidator.equals(
    "page 2 current equals 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit equals 10",
    page2Response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 2 records is valid",
    page2Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 2 pages is valid",
    page2Response.pagination.pages >= 0,
  );
}
