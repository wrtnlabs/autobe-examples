import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_unban_user_by_platform_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // Generate a non-existent banId (valid UUID format) to test permission and existence check
  const nonExistentBanId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to unban a non-existent ban record
  // This should fail with 404 Not Found
  try {
    await api.functional.community.admin.bans.erase(adminConnection, {
      banId: nonExistentBanId,
    });
    throw new Error("Expected HTTP 404 error for non-existent banId");
  } catch (error) {
    if (!typia.is<api.HttpError>(error)) throw error;
    TestValidator.httpError(
      "unban non-existent ban should return 404",
      404,
      () => {
        throw error;
      },
    );
  }
}
