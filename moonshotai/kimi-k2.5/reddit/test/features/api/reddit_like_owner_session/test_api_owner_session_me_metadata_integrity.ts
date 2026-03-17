import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_session_me_metadata_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner and establish authenticated session
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  typia.assert(owner);
  // 2. Retrieve current session information
  const session =
    await api.functional.redditLike.owner.sessions.me.at(ownerConnection);
  typia.assert(session);
  // 3. Validate actor type and owner-specific fields
  TestValidator.equals("actorType is owner", session.actorType, "owner");
  // Validate actor is owner summary with correct details
  const ownerActor = session.actor as IRedditLikeOwner.ISummary;
  TestValidator.equals("actor id matches owner", ownerActor.id, owner.id);
  TestValidator.equals(
    "actor email matches owner",
    ownerActor.email,
    owner.email,
  );
  TestValidator.equals(
    "actor username matches owner",
    ownerActor.username,
    owner.username,
  );
  TestValidator.equals(
    "actor displayName matches owner",
    ownerActor.displayName,
    owner.display_name,
  );
  TestValidator.equals("actor isActive is true", ownerActor.isActive, true);
  // 4. Validate session metadata fields are properly captured
  TestValidator.predicate(
    "ip is present and non-empty",
    () => session.ip.length > 0,
  );
  TestValidator.predicate(
    "href is present and non-empty",
    () => session.href.length > 0,
  );
  TestValidator.predicate(
    "referrer is present",
    () => typeof session.referrer === "string",
  );
  // userAgent is nullable for owner sessions per schema (not stored in owner_sessions table)
  TestValidator.equals(
    "userAgent is null for owner session",
    session.userAgent,
    null,
  );
  // 5. Validate timestamp fields are present and temporally consistent
  const createdAt = new Date(session.createdAt);
  if (session.expiresAt !== null) {
    const expiresAt = new Date(session.expiresAt);
    TestValidator.predicate(
      "expiresAt is after createdAt",
      () => expiresAt > createdAt,
    );
  }
  if (session.expiredAt !== null) {
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate(
      "expiredAt is after createdAt",
      () => expiredAt > createdAt,
    );
  }
}
