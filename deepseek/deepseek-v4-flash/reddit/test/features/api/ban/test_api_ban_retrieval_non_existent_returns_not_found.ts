import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
 * Test that retrieving a ban record with a non-existent UUID returns a 404 Not Found error.
 *
 * Validates that the ban retrieval endpoint correctly returns a 404 status when queried with a UUID that does not match any existing ban record. This covers cases where the ban never existed (random UUID) or was previously lifted and hard-deleted per the Ban Lifecycle specification.
 *
 * 1. Join as an authenticated member via the registration flow.
 * 2. Generate a random UUID that does not correspond to any ban in the database.
 * 3. Call GET /communityPlatform/member/bans/{banId} with the non-existent UUID.
 * 4. Assert that the API responds with a 404 HTTP status error.
 */
export async function test_api_ban_retrieval_non_existent_returns_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member to obtain an authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random UUID that does not correspond to any ban record
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve a ban with the non-existent UUID, expect 404
  await TestValidator.httpError(
    "retrieving non-existent ban returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.bans.at(memberConnection, {
        banId: nonExistentBanId,
      });
    },
  );
}
