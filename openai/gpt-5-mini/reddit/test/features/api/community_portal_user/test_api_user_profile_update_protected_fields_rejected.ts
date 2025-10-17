import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function test_api_user_profile_update_protected_fields_rejected(
  connection: api.IConnection,
) {
  // Strategy: create two isolated authenticated contexts (connA, connB) so
  // we can test owner updates and unauthorized updates without touching the
  // original connection.headers. Then perform an owner update and verify
  // protected fields are unchanged and no sensitive fields are exposed.

  // 1) Create isolated connections for two members
  const connA: api.IConnection = { ...connection, headers: {} };
  const connB: api.IConnection = { ...connection, headers: {} };

  // 2) Register member A
  const usernameA = RandomGenerator.alphaNumeric(8);
  const emailA = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const passwordA = `P@ssw0rd${RandomGenerator.alphaNumeric(4)}`;

  const memberA: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connA, {
      body: {
        username: usernameA,
        email: emailA as string & tags.Format<"email">,
        password: passwordA,
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(memberA);

  // 3) Register member B
  const usernameB = RandomGenerator.alphaNumeric(8);
  const emailB = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const passwordB = `P@ssw0rd${RandomGenerator.alphaNumeric(4)}`;

  const memberB: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connB, {
      body: {
        username: usernameB,
        email: emailB as string & tags.Format<"email">,
        password: passwordB,
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(memberB);

  // Sanity: ensure we have ids
  TestValidator.predicate("memberA id exists", typeof memberA.id === "string");
  TestValidator.predicate("memberB id exists", typeof memberB.id === "string");

  // 4) Owner (memberA) updates editable fields
  const updateBody = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 8 }),
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPortalUser.IUpdate;

  const updatedA: ICommunityPortalUser.ISummary =
    await api.functional.communityPortal.member.users.update(connA, {
      userId: memberA.id,
      body: updateBody,
    });
  typia.assert(updatedA);

  // 5) Validate editable fields updated
  TestValidator.equals(
    "display_name updated",
    updatedA.display_name,
    updateBody.display_name,
  );
  TestValidator.equals("bio updated", updatedA.bio, updateBody.bio);
  TestValidator.equals(
    "avatar_uri updated",
    updatedA.avatar_uri,
    updateBody.avatar_uri,
  );

  // 6) Validate protected fields unchanged
  TestValidator.equals(
    "username unchanged",
    updatedA.username,
    memberA.username,
  );
  TestValidator.equals("karma unchanged", updatedA.karma, memberA.karma);
  TestValidator.equals(
    "created_at unchanged",
    updatedA.created_at,
    memberA.created_at,
  );

  // 7) Ensure no sensitive password_hash property is exposed in response
  TestValidator.predicate(
    "password_hash not exposed",
    !("password_hash" in updatedA),
  );

  // 8) Authorization negative test: memberB must NOT be able to update memberA
  await TestValidator.error(
    "other user cannot update another user's profile",
    async () => {
      await api.functional.communityPortal.member.users.update(connB, {
        userId: memberA.id,
        body: {
          display_name: "malicious",
        } satisfies ICommunityPortalUser.IUpdate,
      });
    },
  );
}
