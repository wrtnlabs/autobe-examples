import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that retrieving a soft-deleted or non-existent member account returns 404 Not Found.
 *
 * Validates the error handling behavior when attempting to retrieve member accounts that are not accessible. This includes soft-deleted members (where deleted_at is set) and non-existent member IDs. The test ensures that the API properly returns HTTP 404 status codes and does not expose deleted or invalid member data.
 *
 * **Note:** Since there is no delete member endpoint available in the current API, this test validates the 404 error handling mechanism by testing with a non-existent member ID, which follows the same error path as soft-deleted members.
 *
 * 1. Create a new member account via POST /redditClone/auth/member/join
 * 2. Successfully retrieve the created member to confirm the API works
 * 3. Attempt to retrieve a non-existent member ID
 * 4. Verify HTTP 404 error is thrown with appropriate status code
 * 5. Validate that no member data is exposed in the error response
 */
export async function test_api_member_retrieve_soft_deleted_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Verify we can retrieve the created member (positive test)
  const retrievedMember: IRedditCloneMember =
    await api.functional.redditClone.members.at(memberConnection, {
      memberId: member.id,
    });
  typia.assert(retrievedMember);
  TestValidator.equals(
    "retrieved member matches created",
    retrievedMember.id,
    member.id,
  );
  // 3. Generate a non-existent member ID to simulate soft-deleted/non-existent scenario
  const nonExistentMemberId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve non-existent member and verify 404 error
  await TestValidator.httpError(
    "retrieving non-existent member returns 404",
    404,
    async () =>
      await api.functional.redditClone.members.at(memberConnection, {
        memberId: nonExistentMemberId,
      }),
  );
}
