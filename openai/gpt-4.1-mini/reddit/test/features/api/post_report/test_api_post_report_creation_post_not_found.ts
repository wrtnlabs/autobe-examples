import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_reports_posts_report_create_report } from "../../../generate/generate_random_community_platform_user_reports_posts_report_create_report";
import { prepare_random_community_platform_post_report } from "../../../prepare/prepare_random_community_platform_post_report";

export async function test_api_post_report_creation_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // Set authorization header for user connection
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorizedUser.token.access;
  // 2. Try reporting a non-existent post with a valid reason
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const reportBody = {
    reason: "Inappropriate content",
  } satisfies ICommunityPlatformPostReport.ICreate;
  await TestValidator.httpError(
    "report non-existent post should return 404 Not Found",
    404,
    async () => {
      await generate_random_community_platform_user_reports_posts_report_create_report(
        userConnection,
        {
          params: { postId: nonExistentPostId },
          body: reportBody,
        },
      );
    },
  );
}
