import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_detail_owned_access(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: `https://example.com/${RandomGenerator.alphabets(8)}` satisfies string as string &
      tags.Format<"uri">,
    referrer:
      `https://referrer.example.com/${RandomGenerator.alphabets(8)}` satisfies string as string &
        tags.Format<"uri">,
    ip: "203.0.113.10" satisfies string as string & tags.Format<"ipv4">,
  } satisfies ICommunityPlatformMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformMember.IAuthorized>(authorized);
  const accessTokenParts = authorized.token.access.split(".");
  TestValidator.equals("jwt has 3 segments", accessTokenParts.length, 3);
  const payloadSegment = accessTokenParts[1]!;
  const normalizedPayload = payloadSegment
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(payloadSegment.length / 4) * 4, "=");
  const bufferConstructor = globalThis.Buffer;
  TestValidator.predicate(
    "Buffer is available for JWT payload decoding",
    bufferConstructor !== undefined,
  );
  const payloadText = bufferConstructor
    .from(normalizedPayload, "base64")
    .toString("utf8");
  const payload = typia.assert<{
    sid: string & tags.Format<"uuid">;
  }>(JSON.parse(payloadText));
  const sessionId = payload.sid;
  const session = await api.functional.communityPlatform.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert<ICommunityPlatformMemberSession>(session);
  TestValidator.equals("session id matches token sid", session.id, sessionId);
  TestValidator.equals(
    "session ip matches join input",
    session.ip,
    joinBody.ip,
  );
  TestValidator.equals(
    "session href matches join input",
    session.href,
    joinBody.href,
  );
  TestValidator.equals(
    "session referrer matches join input",
    session.referrer,
    joinBody.referrer,
  );
  TestValidator.equals(
    "member id matches joined member",
    session.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member code matches joined member",
    session.member.code,
    authorized.code,
  );
  TestValidator.equals(
    "member email matches joined member",
    session.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member email verified matches joined member",
    session.member.email_verified,
    authorized.emailVerified,
  );
  TestValidator.equals(
    "member status matches joined member",
    session.member.status,
    authorized.status,
  );
  TestValidator.equals(
    "member last signed in matches joined member",
    session.member.last_signed_in_at,
    authorized.lastSignedInAt,
  );
  TestValidator.equals(
    "member created at matches joined member",
    session.member.created_at,
    authorized.createdAt,
  );
  TestValidator.equals(
    "member updated at matches joined member",
    session.member.updated_at,
    authorized.updatedAt,
  );
  TestValidator.equals(
    "member deleted at matches joined member",
    session.member.deleted_at,
    authorized.deletedAt,
  );
  TestValidator.equals(
    "session expiry aligns with refreshable lifetime",
    session.expired_at,
    authorized.token.refreshable_until,
  );
  const sessionAgain =
    await api.functional.communityPlatform.member.sessions.at(
      memberConnection,
      {
        sessionId,
      },
    );
  typia.assert<ICommunityPlatformMemberSession>(sessionAgain);
  TestValidator.equals("repeat lookup is read only", sessionAgain, session);
}
