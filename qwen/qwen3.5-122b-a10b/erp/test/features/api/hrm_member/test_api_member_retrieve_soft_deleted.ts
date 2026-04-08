import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test administrator retrieval of soft-deleted member account details.
 *
 * Validates that soft-deleted member accounts remain accessible through the administrative member retrieval endpoint. This test ensures data retention requirements are met while maintaining security by excluding sensitive fields like password hashes from the response.
 *
 * The test verifies that soft-deleted members (deleted_at is not null) can still be retrieved for administrative and audit purposes, with all required fields present and properly formatted.
 *
 * 1. Generate a valid UUID for the member identifier.
 * 2. Call GET /hrm/members/{memberId} endpoint with administrative credentials.
 * 3. Validate response structure matches IHrmMember type.
 * 4. Verify deleted_at field contains a valid ISO 8601 datetime (not null).
 * 5. Confirm all required fields are present: id, email, created_at, updated_at, deleted_at.
 * 6. Verify password_hash is NOT present in the response (security requirement).
 */
export async function test_api_member_retrieve_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for the member identifier
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the API to retrieve member details
  const member: IHrmMember = await api.functional.hrm.members.at(connection, {
    memberId,
  });
  // Validate response structure with complete type checking
  typia.assert(member);
  // Verify the returned id matches the requested memberId
  TestValidator.equals("member id matches requested", member.id, memberId);
  // Verify deleted_at is not null (confirming soft-deleted status)
  TestValidator.predicate("deleted_at is not null", member.deleted_at !== null);
  // Verify deleted_at is in the past (relative to created_at)
  if (member.deleted_at !== null) {
    const deletedAtDate = new Date(member.deleted_at);
    const createdAtDate = new Date(member.created_at);
    TestValidator.predicate(
      "deleted_at is after created_at",
      deletedAtDate.getTime() >= createdAtDate.getTime(),
    );
  }
  // Security verification: password_hash should NOT be in response
  // Since IHrmMember type doesn't include password_hash, typia.assert already validates this
  // Additional runtime check to ensure no extra properties exist
  const responseKeys = Object.keys(member);
  TestValidator.predicate(
    "password_hash not in response",
    !responseKeys.includes("password_hash"),
  );
}
