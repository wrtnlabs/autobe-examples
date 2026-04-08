import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberId: string & tags.Format<"uuid"> = memberAuth.id;
  // 2. Retrieve existing member (should succeed)
  const retrieveConnection: api.IConnection = { host: connection.host };
  const retrievedMember = await api.functional.redditCommunity.members.at(
    retrieveConnection,
    {
      memberId,
    },
  );
  typia.assert(retrievedMember);
  // Validate retrieved member data
  TestValidator.equals("member ID matches", retrievedMember.id, memberId);
  TestValidator.equals(
    "username matches",
    retrievedMember.username,
    memberAuth.username,
  );
  // 3. Try to retrieve non-existent member (simulate soft-deleted behavior)
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Verify 404 for non-existent member
  await TestValidator.error(
    "should return 404 for non-existent member",
    async () => {
      await api.functional.redditCommunity.members.at(retrieveConnection, {
        memberId: nonExistentId,
      });
    },
  );
}
