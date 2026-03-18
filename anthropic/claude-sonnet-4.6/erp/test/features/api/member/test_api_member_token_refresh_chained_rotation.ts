import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_chained_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and capture initial token + identity
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {});
  typia.assert(joinResponse);
  const initialRefreshToken = joinResponse.token.refresh;
  const initialAccessToken = joinResponse.token.access;
  const originalMemberId = joinResponse.member.id;
  const originalMemberEmail = joinResponse.member.email;
  // Step 2: First refresh — use the initial refresh token to get generation-2 tokens
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refresh1Response = await authorize_member_refresh(refreshConnection1, {
    body: { refresh: initialRefreshToken } satisfies IErpHrmMember.IRefresh,
  });
  typia.assert(refresh1Response);
  const secondRefreshToken = refresh1Response.token.refresh;
  const secondAccessToken = refresh1Response.token.access;
  // Step 3: Second refresh (chained) — use the rotated refresh token to get generation-3 tokens
  const refreshConnection2: api.IConnection = { host: connection.host };
  const refresh2Response = await authorize_member_refresh(refreshConnection2, {
    body: { refresh: secondRefreshToken } satisfies IErpHrmMember.IRefresh,
  });
  typia.assert(refresh2Response);
  const thirdAccessToken = refresh2Response.token.access;
  const thirdRefreshToken = refresh2Response.token.refresh;
  // Validate: access tokens are all different across generations
  TestValidator.notEquals(
    "second access token differs from initial",
    secondAccessToken,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "third access token differs from initial",
    thirdAccessToken,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "third access token differs from second",
    thirdAccessToken,
    secondAccessToken,
  );
  // Validate: refresh tokens are all different across generations
  TestValidator.notEquals(
    "second refresh token differs from initial",
    secondRefreshToken,
    initialRefreshToken,
  );
  TestValidator.notEquals(
    "third refresh token differs from initial",
    thirdRefreshToken,
    initialRefreshToken,
  );
  TestValidator.notEquals(
    "third refresh token differs from second",
    thirdRefreshToken,
    secondRefreshToken,
  );
  // Validate: third-generation token timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "third token expired_at is in the future",
    refresh2Response.token.expired_at > now,
  );
  TestValidator.predicate(
    "third token refreshable_until is in the future",
    refresh2Response.token.refreshable_until > now,
  );
  // Validate: member identity remains consistent across all refreshes
  TestValidator.equals(
    "member id consistent after first refresh",
    refresh1Response.member.id,
    originalMemberId,
  );
  TestValidator.equals(
    "member id consistent after second refresh",
    refresh2Response.member.id,
    originalMemberId,
  );
  TestValidator.equals(
    "member email consistent after first refresh",
    refresh1Response.member.email,
    originalMemberEmail,
  );
  TestValidator.equals(
    "member email consistent after second refresh",
    refresh2Response.member.email,
    originalMemberEmail,
  );
}
