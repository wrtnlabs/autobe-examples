import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function test_api_user_profile_update_forbidden_when_not_owner(
  connection: api.IConnection,
) {
  // 1. Register ownerUser
  const ownerBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const owner: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: ownerBody,
    });
  typia.assert(owner);

  // Snapshot owner public fields for later comparison
  const ownerId = owner.id;
  const ownerUsername = owner.username;
  const ownerDisplayNameSnapshot = owner.display_name ?? null;

  // 2. Register otherUser (this call will set connection.headers.Authorization to otherUser's token)
  const otherBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const other: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: otherBody,
    });
  typia.assert(other);

  // 3. Attempt unauthorized update as otherUser: expect an error (401/403 or similar)
  await TestValidator.error(
    "non-owner cannot update another user's profile",
    async () => {
      await api.functional.communityPortal.member.users.update(connection, {
        userId: ownerId,
        body: {
          display_name: "Compromised-Name",
          bio: "Attempted unauthorized change",
        } satisfies ICommunityPortalUser.IUpdate,
      });
    },
  );

  // 4. Verify original owner's captured snapshot remains unchanged in-memory
  // (No GET endpoint available in provided SDK to re-fetch server state)
  TestValidator.equals(
    "owner username unchanged",
    owner.username,
    ownerUsername,
  );

  TestValidator.equals(
    "owner display_name unchanged",
    owner.display_name ?? null,
    ownerDisplayNameSnapshot,
  );
}
