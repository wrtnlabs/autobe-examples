import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderation_actions_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using the authorization utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Define pagination parameters
  const pagination: ICommunityPlatformModerationAction.IRequest = {
    page: 1,
    limit: 25,
  } satisfies ICommunityPlatformModerationAction.IRequest;
  // Call the moderation actions index endpoint using the authenticated admin connection
  const result: IPageICommunityPlatformModerationAction =
    await api.functional.communityPlatform.admin.moderation.actions.index(
      adminConnection,
      {
        body: pagination,
      },
    );
  // Validate the entire response structure and type with typia.assert()
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    result.pagination.current,
    pagination.page,
  );
  TestValidator.equals(
    "pagination limit",
    result.pagination.limit,
    pagination.limit,
  );
}
