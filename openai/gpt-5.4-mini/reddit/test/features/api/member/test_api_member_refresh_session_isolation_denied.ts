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

export async function test_api_member_refresh_session_isolation_denied(
  connection: api.IConnection,
): Promise<void> {
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphaNumeric(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphaNumeric(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member2);
  await TestValidator.error(
    "refresh token from one member must not be reusable in another member context",
    async () => {
      await authorize_member_refresh(member2Connection, {
        body: {
          refreshToken: member1.token.refresh,
        } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );
  const refreshedMember1 = await authorize_member_refresh(member1Connection, {
    body: {
      refreshToken: member1.token.refresh,
    } satisfies ICommunityPlatformMember.IRefresh,
  });
  typia.assert(refreshedMember1);
  TestValidator.equals(
    "refreshed member id should match original member",
    refreshedMember1.id,
    member1.id,
  );
  TestValidator.equals(
    "refreshed member email should match original member",
    refreshedMember1.email,
    member1.email,
  );
  TestValidator.equals(
    "refreshed member username should match original member",
    refreshedMember1.username,
    member1.username,
  );
}
