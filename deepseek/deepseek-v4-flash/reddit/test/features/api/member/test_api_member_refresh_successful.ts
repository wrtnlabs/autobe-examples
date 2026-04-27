import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_successful(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful token refresh for an authenticated member.
   *
   * Registers a new member, captures the initial JWT access and refresh tokens, then calls the refresh endpoint to obtain a new token pair. Validates that both tokens are rotated (new values differ from old), and that the member identity fields (id, email, username, profile) remain identical between the join and refresh responses since both reference the same underlying member account.
   */
  // 1. Register a new member and capture initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {});
  typia.assert(joined);
  const access_A: string = joined.token.access;
  const token_A: string = joined.token.refresh;
  // 2. Create a fresh connection and refresh tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh: token_A,
    } satisfies ICommunityPlatformMember.IRefresh,
  });
  typia.assert(refreshed);
  const access_B: string = refreshed.token.access;
  const token_B: string = refreshed.token.refresh;
  // 3. Validate token rotation - both tokens must be different
  TestValidator.notEquals("access token rotated", access_A, access_B);
  TestValidator.notEquals("refresh token rotated", token_A, token_B);
  // 4. Validate member identity fields are identical between join and refresh
  TestValidator.equals("member id unchanged", joined.id, refreshed.id);
  TestValidator.equals("member email unchanged", joined.email, refreshed.email);
  TestValidator.equals(
    "member username unchanged",
    joined.username,
    refreshed.username,
  );
  // 5. Validate profile identity fields are identical
  TestValidator.equals(
    "profile id unchanged",
    joined.profile.id,
    refreshed.profile.id,
  );
  TestValidator.equals(
    "profile display_name unchanged",
    joined.profile.display_name,
    refreshed.profile.display_name,
  );
  // 6. Validate profile member summary is identical
  TestValidator.equals(
    "profile member id unchanged",
    joined.profile.member.id,
    refreshed.profile.member.id,
  );
  TestValidator.equals(
    "profile member email unchanged",
    joined.profile.member.email,
    refreshed.profile.member.email,
  );
  TestValidator.equals(
    "profile member username unchanged",
    joined.profile.member.username,
    refreshed.profile.member.username,
  );
}
