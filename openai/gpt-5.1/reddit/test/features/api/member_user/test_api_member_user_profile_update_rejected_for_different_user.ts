import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_member_user_profile_update_rejected_for_different_user(
  connection: api.IConnection,
) {
  // 1. Register User A
  const joinRequestA =
    typia.random<ICommunityPlatformMemberuser.IJoinRequest>();
  const userA = await api.functional.auth.memberUser.join(connection, {
    body: joinRequestA,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(userA);

  const userAId = userA.id;

  // 2. Register User B (this also authenticates as B because join sets Authorization header)
  const joinRequestB =
    typia.random<ICommunityPlatformMemberuser.IJoinRequest>();
  const userB = await api.functional.auth.memberUser.join(connection, {
    body: joinRequestB,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(userB);

  const userBId = userB.id;

  // 3. As User B, attempt to update User A's profile and expect an authorization failure
  const forbiddenUpdateBody = {
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformMemberuser.IUpdate;

  await TestValidator.error(
    "member user cannot update another user's profile",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.update(
        connection,
        {
          memberUserId: userAId,
          body: forbiddenUpdateBody,
        },
      );
    },
  );

  // 4. Optional sanity check: User B can update own profile successfully
  const selfUpdateBody = {
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformMemberuser.IUpdate;

  const updatedSelf =
    await api.functional.communityPlatform.memberUser.memberUsers.update(
      connection,
      {
        memberUserId: userBId,
        body: selfUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformMemberuser>(updatedSelf);
}
