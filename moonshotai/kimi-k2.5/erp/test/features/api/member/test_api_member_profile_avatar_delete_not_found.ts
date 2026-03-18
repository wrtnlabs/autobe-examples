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

export async function test_api_member_profile_avatar_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a member connection for testing
  const memberConnection: api.IConnection = { host: connection.host };
  // Register a member without an avatar (avatarUrl: null)
  await authorize_member_join(memberConnection, {
    body: {
      avatarUrl: null,
    },
  });
  // Attempt to delete avatar when none exists - should return 404
  await TestValidator.httpError(
    "should return 404 when deleting non-existent avatar",
    404,
    async () => {
      await api.functional.erpHrm.member.profile.avatar.erase(memberConnection);
    },
  );
}
