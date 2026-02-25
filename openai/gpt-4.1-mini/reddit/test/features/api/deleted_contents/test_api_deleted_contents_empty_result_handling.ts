import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeletedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_deleted_contents_empty_result_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test-password",
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
    },
  });
  adminConnection.headers = { Authorization: admin.token.access };
  // 2. Query deleted contents with filter guaranteed no results
  const emptyFilter: ICommunityPlatformDeletedContent.IRequest = {
    moderator_id: typia.random<string & tags.Format<"uuid">>(),
    user_id: typia.random<string & tags.Format<"uuid">>(),
    post_id: typia.random<string & tags.Format<"uuid">>(),
    comment_id: typia.random<string & tags.Format<"uuid">>(),
    createdAfter: new Date().toISOString(),
    createdBefore: new Date().toISOString(),
    page: 1,
    limit: 10,
  };
  const output =
    await api.functional.communityPlatform.admin.deleted_contents.index(
      adminConnection,
      { body: emptyFilter },
    );
  typia.assert(output);
  // 3. Validate response is empty list with valid pagination
  TestValidator.equals("empty data length", output.data.length, 0);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.equals("pagination records", output.pagination.records, 0);
  TestValidator.equals("pagination pages", output.pagination.pages, 0);
}
