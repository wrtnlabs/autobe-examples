import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsPushToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPushToken";

export async function test_api_push_token_register_by_member(
  connection: api.IConnection,
) {
  // 1) Create a new community member (self-join) and obtain authorization
  const username = RandomGenerator.alphaNumeric(8); // 3-21 chars allowed, alpha-numeric
  const email = typia.random<string & tags.Format<"email">>();
  const memberBody = {
    email,
    username,
    password: "Passw0rd!",
    session_context: {
      href: "https://example.test/welcome",
      referrer: "https://example.test/landing",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: memberBody,
    });
  typia.assert(authorized);

  // Ensure we have an authenticated member summary and token
  const member = authorized.member;
  typia.assert(member);
  TestValidator.equals(
    "returned username matches created username",
    member.username,
    username,
  );

  // 2) Register a push token for the member
  const pushRequest = {
    token: typia.random<string>(),
    provider: "fcm",
    device_id: RandomGenerator.alphaNumeric(8),
    platform: "android",
    fingerprint: RandomGenerator.alphaNumeric(12),
    expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +1 day
  } satisfies ICommunityBbsPushToken.ICreate;

  const output: ICommunityBbsPushToken =
    await api.functional.communityBbs.communityMember.communityMembers.pushTokens.create(
      connection,
      {
        username: member.username,
        body: pushRequest,
      },
    );
  typia.assert(output);

  // 3) Business assertions on the response (typia.assert already validated types)
  TestValidator.equals("provider returned as fcm", output.provider, "fcm");
  TestValidator.equals(
    "platform returned as android",
    output.platform,
    "android",
  );
  TestValidator.equals("revoked flag defaults to false", output.revoked, false);
  TestValidator.predicate(
    "created_at is present and non-empty",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );

  // Ensure the server DID NOT echo back the raw push token value
  TestValidator.predicate(
    "raw token is not present in response",
    !("token" in output),
  );

  // 4) Verify protected endpoint enforcement: unauthenticated call must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated request to register push token should fail",
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.pushTokens.create(
        unauthConn,
        {
          username: member.username,
          body: pushRequest,
        },
      );
    },
  );
}
