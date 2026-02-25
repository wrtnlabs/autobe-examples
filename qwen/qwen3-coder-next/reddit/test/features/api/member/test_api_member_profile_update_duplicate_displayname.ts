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

export async function test_api_member_profile_update_duplicate_displayname(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two member accounts
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Member1 sets displayName to 'TestUser123'
  const displayName = "TestUser123";
  const updatedMember1 =
    await api.functional.redditClone.member.users.me.update(member1Connection, {
      body: { display_name: displayName } satisfies IRedditCloneMember.IUpdate,
    });
  typia.assert(updatedMember1);
  TestValidator.equals(
    "display name set correctly",
    updatedMember1.displayName,
    displayName,
  );
  // 3. Member2 attempts to set same displayName - should fail
  await TestValidator.error("duplicate display name rejected", async () => {
    await api.functional.redditClone.member.users.me.update(member2Connection, {
      body: { display_name: displayName } satisfies IRedditCloneMember.IUpdate,
    });
  });
  // 4. Verify member2 can still update other fields successfully
  const newBio = RandomGenerator.paragraph({ sentences: 2 });
  const updatedMember2 =
    await api.functional.redditClone.member.users.me.update(member2Connection, {
      body: { bio: newBio } satisfies IRedditCloneMember.IUpdate,
    });
  typia.assert(updatedMember2);
  TestValidator.equals("member2 bio updated", updatedMember2.bio, newBio);
}
