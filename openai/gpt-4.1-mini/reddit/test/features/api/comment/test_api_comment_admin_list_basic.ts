import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_comment_admin_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Retrieve comments list with default parameters
  const output = await api.functional.communityPlatform.admin.comments.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(output);
  // 3. Validations: pagination info
  TestValidator.predicate(
    "pagination current >= 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    output.pagination.pages >= 0,
  );
  // 4. Validate at least one comment summary exists with required fields
  TestValidator.predicate("has at least one comment", output.data.length > 0);
  // 5. Test unauthorized access: use base connection without header
  await TestValidator.httpError(
    "should reject unauthorized for comment list",
    401,
    async () =>
      await api.functional.communityPlatform.admin.comments.index(connection, {
        body: {},
      }),
  );
}
