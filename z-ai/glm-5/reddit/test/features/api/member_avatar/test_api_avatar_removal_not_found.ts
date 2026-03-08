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

/**
 * Test avatar removal when member has no avatar uploaded.
 *
 * Validates that DELETE /communityPlatform/member/avatar returns 404 Not Found
 * when the member has never uploaded an avatar image.
 *
 * Flow:
 * 1. Create a new member account (no avatar by default)
 * 2. Attempt to delete non-existent avatar
 * 3. Validate 404 error response
 */
export async function test_api_avatar_removal_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register (no avatar by default)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Verify new member has no avatar
  TestValidator.equals("new member has no avatar", member.avatarUrl, null);
  // 2. Attempt to delete non-existent avatar
  // 3. Expect 404 error when no avatar exists
  await TestValidator.httpError(
    "should return 404 when avatar does not exist",
    404,
    async () => {
      await api.functional.communityPlatform.member.avatar.erase(
        memberConnection,
      );
    },
  );
}
