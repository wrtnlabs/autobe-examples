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

/**
 * Test that unauthenticated requests to the member profile endpoint are properly rejected.
 *
 * Validates the authorization boundary by testing three unauthenticated scenarios against the GET /communityPlatform/member/profile endpoint. Each variant must consistently return HTTP 401 Unauthorized without leaking any profile data.
 *
 * 1. Request with no Authorization header at all.
 * 2. Request with an invalid/malformed JWT token (random string).
 * 3. Request with an expired or garbage JWT token (random string).
 */
export async function test_api_profile_retrieval_without_authentication(
  connection: api.IConnection,
): Promise<void> {
  // 1. No Authorization header
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("no Authorization header", 401, async () => {
    await api.functional.communityPlatform.member.profile.at(noAuthConnection);
  });
  // 2. Invalid JWT token (random string as Bearer token)
  const invalidTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${RandomGenerator.alphaNumeric(40)}`,
    },
  };
  await TestValidator.httpError("invalid JWT token", 401, async () => {
    await api.functional.communityPlatform.member.profile.at(
      invalidTokenConnection,
    );
  });
  // 3. Expired / garbage JWT token
  const expiredTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${RandomGenerator.alphaNumeric(32)}`,
    },
  };
  await TestValidator.httpError(
    "expired or garbage JWT token",
    401,
    async () => {
      await api.functional.communityPlatform.member.profile.at(
        expiredTokenConnection,
      );
    },
  );
}
