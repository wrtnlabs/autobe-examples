import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ValidPassword123!",
      username: RandomGenerator.name(2),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joined);
  const validRefreshToken = joined.token.refresh;
  typia.assert(validRefreshToken);
  // 2. Test refresh with invalid token format (non-UUID string)
  const invalidFormatConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("invalid token format returns 401", async () => {
    await authorize_member_refresh(invalidFormatConnection, {
      body: {
        refresh_token: "not-a-valid-uuid",
      } satisfies IRedditCommunityMember.IRefresh,
    });
  });
  // 3. Test refresh with malformed UUID (wrong length/characters)
  const malformedUUIDConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("malformed UUID returns 401", async () => {
    await authorize_member_refresh(malformedUUIDConnection, {
      body: {
        refresh_token: "12345-6789-abc-def",
      } satisfies IRedditCommunityMember.IRefresh,
    });
  });
  // 4. Test refresh with non-existent session (random valid UUID)
  const randomUUIDConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("non-existent token returns 401", async () => {
    await authorize_member_refresh(randomUUIDConnection, {
      body: {
        refresh_token: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityMember.IRefresh,
    });
  });
  // 5. Verify original session remains valid after failed refresh attempts
  const verifyConnection: api.IConnection = { host: connection.host };
  const verified = await authorize_member_refresh(verifyConnection, {
    body: {
      refresh_token: validRefreshToken,
    } satisfies IRedditCommunityMember.IRefresh,
  });
  typia.assert(verified);
}
