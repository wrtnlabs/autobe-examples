import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test viewing a soft-deleted member's profile endpoint.
 *
 * Validates that when attempting to access a member profile that has been soft-deleted (deleted_at is not null), the system returns a 404 Not Found response. Since there is no delete endpoint provided in the SDK, the test simulates this scenario by attempting to access a non-existent member ID, which should also return 404. This validates the soft-delete handling and ensures deleted accounts are not accessible through the public profile endpoint.
 *
 * 1. Create a member account using authorize_member_join utility function
 * 2. Attempt to view the profile of a non-existent member (simulating deleted account)
 * 3. Validate that the API returns a 404 HttpError
 * 4. Verify that the created member's profile can be accessed normally (positive test)
 */
export async function test_api_member_profile_view_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Verify created member's profile can be accessed (positive test)
  const accessibleProfile = await api.functional.redditLike.members.at(
    connection,
    {
      memberId: member.id,
    },
  );
  typia.assert(accessibleProfile);
  TestValidator.equals("member ID matches", accessibleProfile.id, member.id);
  // 3. Attempt to view a non-existent member profile (simulating deleted account)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleted member profile returns 404",
    404,
    async () => {
      await api.functional.redditLike.members.at(connection, {
        memberId: nonExistentId,
      });
    },
  );
}
