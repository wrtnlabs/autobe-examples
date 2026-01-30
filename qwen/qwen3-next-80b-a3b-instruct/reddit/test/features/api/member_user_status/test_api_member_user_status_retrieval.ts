import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatus";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_user_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connection for member user and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(memberAuthResponse);
  // Step 2: Use the authenticated member connection to retrieve status
  const statusResponse =
    await api.functional.communityBbs.member.users.status.at(memberConnection);
  typia.assert(statusResponse);
  // Step 3: Validate that response contains proper status field
  // Since status is a union type, we validate it's one of the known values
  // Allowed statuses from ICommunityBbsUserStatus: 'active', 'suspended', 'banned', 'pending_deletion', 'restricted'
  // According to scenario, 'inactive' is returned when no status record exists
  const validStatuses = [
    "active",
    "suspended",
    "banned",
    "pending_deletion",
    "restricted",
    "inactive",
  ] as const;
  TestValidator.predicate(
    "status is a valid member user status including inactive",
    validStatuses.includes(statusResponse.status),
  );
  // Verifying that reason is either string or null/undefined
  // Check that all required fields are present with correct types through typia.assert
  // First ICommunityBbsUserStatus type includes: id, user_id, status, created_at, updated_at, actor_type, actor_id, performed_by (all validated by typia.assert)
  // 'reason' is optional, so we don't assert it directly
  // Step 4: Test the case when no status record exists (should return 'inactive')
  // Note: We can't guarantee a user with missing status record, but we can create a second user
  // System should return 'inactive' if no status record exists
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuthResponse = await authorize_member_join(
    secondMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(secondMemberAuthResponse);
  const secondStatusResponse =
    await api.functional.communityBbs.member.users.status.at(
      secondMemberConnection,
    );
  typia.assert(secondStatusResponse);
  // Validate that the status is one of the valid states
  TestValidator.predicate(
    "second status is a valid member user status including inactive",
    validStatuses.includes(secondStatusResponse.status),
  );
  // Validate that when status is 'inactive', reason is null or undefined
  if ((secondStatusResponse.status satisfies string as string) === "inactive") {
    TestValidator.equals(
      "when status is inactive, reason should be null or undefined",
      secondStatusResponse.reason,
      null,
    );
  }
}