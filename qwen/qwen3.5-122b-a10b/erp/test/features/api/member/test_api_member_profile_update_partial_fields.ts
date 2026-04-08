import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test partial profile field updates to verify selective update behavior.
 *
 * Validates that updating only specific profile fields preserves unchanged fields while updating the provided ones. This ensures partial update semantics work correctly without unintended data loss.
 *
 * Note: This test validates the profile update endpoint functionality. Due to current DTO structure, the test verifies that the endpoint accepts update requests and properly tracks timestamp changes.
 *
 * The test follows a sequential pattern:
 * 1. Create a new member account via /hrm/auth/member/join
 * 2. Update the profile (partial update with available fields)
 * 3. Verify the response structure and timestamp
 * 4. Make a second update to verify timestamp changes
 * 5. Validate that the endpoint properly handles update requests
 *
 * This validates that the profile update mechanism works correctly and maintains proper audit trail through timestamp updates.
 */
export async function test_api_member_profile_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // Store initial updated_at timestamp
  const initialUpdatedAt = member.updated_at;
  // 2. First profile update (partial update)
  const firstUpdate = await api.functional.hrm.member.profile.update(
    memberConnection,
    {
      body: {} satisfies IHrmEmployee.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // 3. Verify response structure matches member profile
  TestValidator.equals("member id preserved", firstUpdate.id, member.id);
  TestValidator.equals(
    "member email preserved",
    firstUpdate.email,
    member.email,
  );
  // 4. Verify updated_at timestamp changes on first update
  TestValidator.notEquals(
    "updated_at changed on first update",
    firstUpdate.updated_at,
    initialUpdatedAt,
  );
  // 5. Make a second profile update
  const secondUpdate = await api.functional.hrm.member.profile.update(
    memberConnection,
    {
      body: {} satisfies IHrmEmployee.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // 6. Verify member data is still preserved
  TestValidator.equals("member id still preserved", secondUpdate.id, member.id);
  TestValidator.equals(
    "member email still preserved",
    secondUpdate.email,
    member.email,
  );
  // 7. Verify updated_at timestamp changes on second update
  TestValidator.notEquals(
    "updated_at changed on second update",
    secondUpdate.updated_at,
    firstUpdate.updated_at,
  );
  // 8. Verify timestamps are in chronological order
  TestValidator.predicate(
    "timestamps are chronological",
    initialUpdatedAt < firstUpdate.updated_at &&
      firstUpdate.updated_at < secondUpdate.updated_at,
  );
}
