import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reports_decisions_erase_not_found_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin+${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "StrongP@ssw0rd",
      displayName: `Admin ${RandomGenerator.name(1)}`,
      bio: null,
      avatarUrl: null,
    },
  });
  // Update adminConnection with authorization token
  adminConnection.headers = {
    Authorization: `Bearer ${admin.token.access}`,
  };
  // 2. Attempt to delete a non-existent report decision by a random UUID
  const nonExistingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent report decision",
    404,
    async () => {
      await api.functional.communityPlatform.admin.reports_decisions.erase(
        adminConnection,
        { id: nonExistingId },
      );
    },
  );
}
