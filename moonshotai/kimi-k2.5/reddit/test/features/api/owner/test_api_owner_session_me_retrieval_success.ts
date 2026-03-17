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

export async function test_api_owner_session_me_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner connection and register new owner to obtain authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {});
  typia.assert(authorized);
  // 2. Retrieve current session information for the authenticated owner
  const session =
    await api.functional.redditLike.owner.sessions.me.at(ownerConnection);
  typia.assert(session);
  // 3. Validate business logic - session belongs to the authenticated owner
  TestValidator.equals(
    "session actorType is owner",
    session.actorType,
    "owner",
  );
  // 4. Validate session actor contains the owner summary with correct data
  // Since actorType is "owner", we can safely access owner-specific properties
  if (session.actorType === "owner") {
    const actor = session.actor as IRedditLikeOwner.ISummary;
    TestValidator.equals(
      "actor id matches authorized owner",
      actor.id,
      authorized.id,
    );
    TestValidator.equals(
      "actor email matches authorized owner",
      actor.email,
      authorized.email,
    );
    TestValidator.equals(
      "actor username matches authorized owner",
      actor.username,
      authorized.username,
    );
    TestValidator.equals(
      "actor displayName matches authorized owner",
      actor.displayName,
      authorized.display_name,
    );
    TestValidator.equals(
      "actor isActive matches authorized owner",
      actor.isActive,
      authorized.is_active,
    );
  }
}
