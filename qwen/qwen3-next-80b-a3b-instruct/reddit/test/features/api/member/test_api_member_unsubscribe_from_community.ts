import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_unsubscribe_from_community(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies ICommunityBbsMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // Step 2: Call erase endpoint to unsubscribe from community
  const unsubscribeResult =
    await api.functional.communityBbs.member.users.subscriptions.erase(
      memberConnection,
    );
  typia.assert(unsubscribeResult);
  // Step 3: Attempt to unsubscribe again - should fail with 404 (subscription not found)
  await TestValidator.error(
    "cannot unsubscribe twice from same community",
    async () => {
      await api.functional.communityBbs.member.users.subscriptions.erase(
        memberConnection,
      );
    },
  );
  // Step 4: Create second member and try to unsubscribe first member - should fail
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
  } satisfies ICommunityBbsMember.IJoin;
  const otherMember = await authorize_member_join(otherMemberConnection, {
    body: otherMemberData,
  });
  typia.assert(otherMember);
  await TestValidator.error(
    "other member cannot unsubscribe another member",
    async () => {
      await api.functional.communityBbs.member.users.subscriptions.erase(
        otherMemberConnection,
      );
    },
  );
}
