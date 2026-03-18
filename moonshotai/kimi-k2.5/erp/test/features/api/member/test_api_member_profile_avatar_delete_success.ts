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

/**
 * Test successful deletion of member profile avatar.
 *
 * 1. Authenticate as a member via join endpoint
 * 2. Upload an avatar image using POST endpoint to ensure something exists to delete
 * 3. Delete the avatar using DELETE endpoint
 * 4. Validate 204 No Content response (void return type)
 */
export async function test_api_member_profile_avatar_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Upload an avatar first to ensure there's something to delete
  const avatarUrl = typia.random<string & tags.Format<"uri">>();
  const uploaded =
    await api.functional.erpHrm.member.profile.avatar.updateAvatar(
      memberConnection,
      {
        body: {
          avatarUrl,
        } satisfies IErpHrmMember.IAvatarUpload,
      },
    );
  typia.assert(uploaded);
  // Verify avatar exists before attempting deletion
  TestValidator.predicate(
    "avatar exists before deletion",
    uploaded.avatarUrl !== null,
  );
  // 3. Delete the avatar - should succeed with 204 No Content (void return)
  const result =
    await api.functional.erpHrm.member.profile.avatar.erase(memberConnection);
  typia.assert(result);
}
