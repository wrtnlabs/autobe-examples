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

export async function test_api_reports_decisions_erase_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that unauthorized delete attempt on report decisions is rejected
  // Create a random UUID for report decision id
  const unauthorizedId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to delete without any authorization header
  await TestValidator.httpError(
    "unauthorized deletion without token",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.reports_decisions.erase(
        connection,
        {
          id: unauthorizedId,
        },
      );
    },
  );
  // Attempt to delete with invalid token (wrong header)
  const invalidConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid.token" },
  };
  await TestValidator.httpError(
    "unauthorized deletion with invalid token",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.reports_decisions.erase(
        invalidConnection,
        {
          id: unauthorizedId,
        },
      );
    },
  );
  // Optionally, attempt to delete with a non-admin authorized user could be tested,
  // but no utility available for non-admin authorization in given context,
  // so skip this.
}
