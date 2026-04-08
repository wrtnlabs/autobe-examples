import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test administrator can retrieve an active member account's details by unique identifier.
 *
 * Validates the GET /hrm/members/{memberId} endpoint returns correct member information with proper security controls. The test ensures that active member accounts (deleted_at is null) can be successfully retrieved with all required fields present and properly formatted.
 *
 * Special attention is given to verifying that the password_hash field is excluded from the response for security purposes, and that all datetime fields conform to ISO 8601 format requirements.
 *
 * 1. Generate a valid UUID for the memberId parameter.
 * 2. Call the GET /hrm/members/{memberId} endpoint with the generated UUID.
 * 3. Validate the response structure matches IHrmMember type.
 * 4. Verify deleted_at is null indicating active member status.
 * 5. Verify created_at and updated_at are valid ISO 8601 datetime strings.
 * 6. Confirm the returned id matches the requested memberId.
 * 7. Validate password_hash is NOT present in the response.
 */
export async function test_api_member_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid UUID for the memberId
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Create admin connection for administrative access
  const adminConnection: api.IConnection = { host: connection.host };
  // 3. Call the endpoint to retrieve member details
  const member: IHrmMember = await api.functional.hrm.members.at(
    adminConnection,
    {
      memberId,
    },
  );
  // 4. Validate response structure
  typia.assert(member);
  // 5. Verify deleted_at is null (active member)
  TestValidator.equals("member is active", member.deleted_at, null);
  // 6. Verify created_at and updated_at are valid ISO 8601 datetime strings
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    !isNaN(Date.parse(member.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    !isNaN(Date.parse(member.updated_at)),
  );
  // 7. Confirm the returned id matches the requested memberId
  TestValidator.equals("member id matches requested", member.id, memberId);
  // 8. Validate password_hash is NOT present in response (security check)
  TestValidator.predicate(
    "password_hash not exposed",
    !("password_hash" in member),
  );
}
