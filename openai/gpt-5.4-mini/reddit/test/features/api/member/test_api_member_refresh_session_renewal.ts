import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_session_renewal(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(joined);
  const refreshed = await authorize_member_refresh(memberConnection, {
    body: {
      refreshToken: joined.token.refresh,
    } satisfies ICommunityPlatformMember.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "member id should remain the same",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "member email should remain the same",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "member username should remain the same",
    refreshed.username,
    joined.username,
  );
  TestValidator.equals(
    "member display name should remain the same",
    refreshed.displayName,
    joined.displayName,
  );
  TestValidator.equals(
    "member bio should remain the same",
    refreshed.bio,
    joined.bio,
  );
  TestValidator.equals(
    "member avatar should remain the same",
    refreshed.avatarImageUri,
    joined.avatarImageUri,
  );
  TestValidator.equals(
    "member karma should remain the same",
    refreshed.karma,
    joined.karma,
  );
  TestValidator.equals(
    "member createdAt should remain the same",
    refreshed.createdAt,
    joined.createdAt,
  );
  TestValidator.equals(
    "member deletedAt should remain null",
    refreshed.deletedAt,
    joined.deletedAt,
  );
  TestValidator.predicate(
    "refreshed access token should exist",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should exist",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed access expiration should exist",
    refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed session expiration should exist",
    refreshed.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "refreshed session should be usable for continued member access",
    refreshed.token.access.length > 0 && refreshed.token.refresh.length > 0,
  );
}
