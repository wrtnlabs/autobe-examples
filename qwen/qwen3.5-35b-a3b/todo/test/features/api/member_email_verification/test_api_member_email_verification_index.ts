import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_email_verification_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for accessing verification records
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Call the email verification listing endpoint with default parameters
  const result =
    await api.functional.multiUserTodo.member_email_verifications.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(result);
  // 3. Verify pagination structure exists and has correct type
  typia.assert(result.pagination);
  // Verify pagination metadata fields exist and are valid
  TestValidator.predicate(
    "pagination current is non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Verify pages calculation is correct: ceil(records / limit)
  const expectedPages =
    result.pagination.records > 0
      ? Math.ceil(result.pagination.records / result.pagination.limit)
      : 0;
  TestValidator.equals(
    "pagination pages calculated correctly",
    result.pagination.pages,
    expectedPages,
  );
  // 4. Verify data array exists and is an array
  typia.assert(result.data);
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  // 5. Verify data count matches pagination records
  TestValidator.equals(
    "data length matches records count",
    result.data.length,
    result.pagination.records,
  );
  // 6. If there are verification records, validate their structure
  if (result.data.length > 0) {
    // Process first record to validate structure
    const firstRecord = result.data[0];
    typia.assert(firstRecord);
    // Verify required fields exist
    TestValidator.equals("verification has id", !!firstRecord.id, true);
    TestValidator.equals("verification has email", !!firstRecord.email, true);
    TestValidator.equals(
      "verification has expires_at",
      !!firstRecord.expires_at,
      true,
    );
    TestValidator.equals(
      "verification has created_at",
      !!firstRecord.created_at,
      true,
    );
    TestValidator.equals("verification has member", !!firstRecord.member, true);
    // Verify id is valid UUID format
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    TestValidator.equals(
      "id is valid UUID format",
      uuidPattern.test(firstRecord.id),
      true,
    );
    // Verify email is valid email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    TestValidator.equals(
      "email is valid format",
      emailPattern.test(firstRecord.email),
      true,
    );
    // Verify timestamps are valid ISO datetime
    TestValidator.equals(
      "created_at is valid ISO datetime",
      !isNaN(Date.parse(firstRecord.created_at)),
      true,
    );
    TestValidator.equals(
      "expires_at is valid ISO datetime",
      !isNaN(Date.parse(firstRecord.expires_at)),
      true,
    );
    // Verify expires_at is after created_at (token valid at creation)
    TestValidator.predicate(
      "expires_at is after created_at",
      new Date(firstRecord.expires_at).getTime() >
        new Date(firstRecord.created_at).getTime(),
    );
    // Verify member object structure
    typia.assert(firstRecord.member);
    TestValidator.equals("member has id", !!firstRecord.member.id, true);
    TestValidator.equals("member has email", !!firstRecord.member.email, true);
    TestValidator.equals(
      "member has created_at",
      !!firstRecord.member.created_at,
      true,
    );
    TestValidator.equals(
      "member has updated_at",
      !!firstRecord.member.updated_at,
      true,
    );
    TestValidator.predicate(
      "member deleted_at is null or string",
      firstRecord.member.deleted_at === null ||
        typeof firstRecord.member.deleted_at === "string",
    );
    // Verify member email matches verification email
    TestValidator.equals(
      "member email matches verification email",
      firstRecord.member.email,
      firstRecord.email,
    );
  }
  // 7. Verify default sort order if multiple records exist
  if (result.data.length > 1) {
    // Check first two records for descending order by created_at
    const firstCreated = new Date(result.data[0].created_at).getTime();
    const secondCreated = new Date(result.data[1].created_at).getTime();
    TestValidator.predicate(
      "results sorted by created_at descending (first two)",
      firstCreated >= secondCreated,
    );
  }
  // 8. Verify pagination metadata consistency
  if (result.pagination.records > 0) {
    TestValidator.equals(
      "current page is 1 when limit < records",
      result.pagination.current,
      1,
    );
  }
  // 9. Verify data type safety - all items in array have same structure
  if (result.data.length > 1) {
    const firstRecord = result.data[0];
    const lastRecord = result.data[result.data.length - 1];
    typia.assert(firstRecord);
    typia.assert(lastRecord);
    TestValidator.equals(
      "all records have id field",
      !!lastRecord.id,
      !!firstRecord.id,
    );
    TestValidator.equals(
      "all records have email field",
      !!lastRecord.email,
      !!firstRecord.email,
    );
    TestValidator.equals(
      "all records have member field",
      !!lastRecord.member,
      !!firstRecord.member,
    );
  }
}
