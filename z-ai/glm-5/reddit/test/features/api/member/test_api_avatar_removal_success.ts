import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAvatarFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAvatarFile";
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
import { generate_random_community_platform_member_avatar_create } from "../../../generate/generate_random_community_platform_member_avatar_create";
import { prepare_random_community_platform_avatar_file } from "../../../prepare/prepare_random_community_platform_avatar_file";

/**
 * Test successful avatar removal when member has an existing avatar.
 *
 * This test verifies that:
 * 1. A member with an existing avatar can successfully remove it
 * 2. The avatar URL is populated after upload
 * 3. The deletion operation completes successfully
 * 4. Attempting to delete a non-existent avatar returns 404
 */
export async function test_api_avatar_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Upload an avatar
  const memberWithAvatar: ICommunityPlatformMember =
    await generate_random_community_platform_member_avatar_create(
      memberConnection,
      {},
    );
  typia.assert(memberWithAvatar);
  // 3. Verify the avatar exists after upload
  TestValidator.predicate(
    "avatar should exist after upload",
    memberWithAvatar.avatarUrl !== null,
  );
  // 4. Delete the avatar
  await api.functional.communityPlatform.member.avatar.erase(memberConnection);
  // 5. Verify deletion by attempting to delete again (should fail with 404)
  await TestValidator.httpError(
    "should return 404 when avatar does not exist",
    404,
    () =>
      api.functional.communityPlatform.member.avatar.erase(memberConnection),
  );
}
