import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsPushToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPushToken";

export async function test_api_push_token_revoke_idempotent(
  connection: api.IConnection,
) {
  /**
   * Purpose: Test idempotent behavior of revoking a push token for a community
   * member.
   *
   * Notes on limitations:
   *
   * - The provided SDK exposes: join (create member + auth), pushTokens.create,
   *   and pushTokens.erase. There is NO GET/read endpoint for push tokens in
   *   the provided SDK, nor direct DB access in this test helper context. Thus
   *   we cannot directly assert DB fields (deleted_at, revoked) after revoke.
   *   Because of that limitation, this test validates idempotency by calling
   *   DELETE twice (ensuring no exception) and asserts that deleting a
   *   non-existent UUID causes an error. This aligns with available API
   *   semantics and avoids testing raw HTTP status codes.
   */

  // 1) Create a community member (self-join) and obtain authorization
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(8); // safe username chars
  const password = "Passw0rd!"; // simple password satisfying policy

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: {
        email,
        username,
        password,
        session_context: {
          href: "https://example.test/welcome",
          referrer: "https://example.test/",
        },
      },
    });
  typia.assert(authorized);

  const memberUsername = authorized.member.username;
  TestValidator.equals(
    "created member username matches request",
    memberUsername,
    username,
  );

  // 2) Register a push token for the member
  const createBody = {
    token: RandomGenerator.alphaNumeric(32),
    provider: "fcm",
    device_id: RandomGenerator.alphaNumeric(8),
    platform: "android",
  } satisfies ICommunityBbsPushToken.ICreate;

  const push: ICommunityBbsPushToken =
    await api.functional.communityBbs.communityMember.communityMembers.pushTokens.create(
      connection,
      {
        username: memberUsername,
        body: createBody,
      },
    );
  typia.assert(push);

  // Basic business assertion: token initially not revoked
  TestValidator.predicate(
    "push token is initially not revoked",
    push.revoked === false,
  );

  // 3) Revoke the token (first revoke)
  await api.functional.communityBbs.communityMember.communityMembers.pushTokens.erase(
    connection,
    {
      username: memberUsername,
      pushTokenId: push.id,
    },
  );

  // 4) Revoke the same token again to verify idempotency (should not throw)
  await api.functional.communityBbs.communityMember.communityMembers.pushTokens.erase(
    connection,
    {
      username: memberUsername,
      pushTokenId: push.id,
    },
  );

  // If execution reaches here, the second revoke did not throw — idempotency
  TestValidator.predicate("second revoke completed (idempotent)", true);

  // 5) Attempt to revoke a non-existent pushTokenId and expect an error to be thrown
  await TestValidator.error(
    "revoking a non-existent pushTokenId should throw",
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.pushTokens.erase(
        connection,
        {
          username: memberUsername,
          pushTokenId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
