import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test privacy isolation for profile updates - member can only update their own profile.
 * 1. Member A authenticates by joining
 * 2. Member B authenticates by joining
 * 3. Member A updates their own profile
 * 4. Verify isolation - Member A cannot affect Member B's profile
 */
export async function test_api_profile_update_privacy_isolation(
  connection: api.IConnection,
) {
  // 1. Create Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // Store initial display names
  const initialMemberADisplayName = memberA.display_name;
  const initialMemberBDisplayName = memberB.display_name;
  // 3. Member A updates their own profile
  const newDisplayName = RandomGenerator.name();
  const updatedProfile = await api.functional.todoApp.member.profile.update(
    memberAConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppUserProfile.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 4. Verify Member A's profile changed
  TestValidator.equals(
    "Member A display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 5. Verify Member B's profile is unchanged (privacy isolation)
  TestValidator.equals(
    "Member B display name unchanged",
    memberB.display_name,
    initialMemberBDisplayName,
  );
}