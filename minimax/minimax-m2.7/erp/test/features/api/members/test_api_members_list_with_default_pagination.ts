import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_members_list_with_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Call PATCH /erpHrm/members with empty body to use default pagination
  const output = await api.functional.erpHrm.members.index(connection, {
    body: {},
  });
  typia.assert(output);
  // Validate pagination metadata with default values
  TestValidator.equals(
    "pagination.current should be 1",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should be 20 (default)",
    output.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination.records should be >= 1",
    output.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 1",
    output.pagination.pages >= 1,
  );
  // Validate response structure
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(output.data),
  );
  TestValidator.equals(
    "data length should match records",
    output.data.length,
    output.pagination.records,
  );
  // Validate each member in the data array
  for (const member of output.data) {
    // Verify required fields exist and have correct types
    TestValidator.predicate(
      "member id should be valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        member.id,
      ),
    );
    TestValidator.predicate(
      "member email should be valid format",
      /^[^s@]+@[^s@]+\.[^\s@]+$/.test(member.email),
    );
    TestValidator.predicate(
      "member displayName should be non-empty string",
      typeof member.displayName === "string" && member.displayName.length > 0,
    );
    TestValidator.predicate(
      "member createdAt should be valid ISO datetime",
      !isNaN(Date.parse(member.createdAt)),
    );
    // Verify optional fields (may be null or undefined)
    // avatarUri, phone, deletedAt can all be null/undefined - no specific validation needed
    // Verify soft-deleted members are excluded (deletedAt should be null or undefined)
    TestValidator.predicate(
      "member should not be soft-deleted",
      member.deletedAt === null || member.deletedAt === undefined,
    );
  }
}
