import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_post_reports_create } from "../../../generate/generate_random_community_platform_user_post_reports_create";
import { prepare_random_community_platform_post_report } from "../../../prepare/prepare_random_community_platform_post_report";

export async function test_api_post_report_deletion_nonexistent_report_handling(
  connection: api.IConnection,
): Promise<void> {
  // Test deletion of a post report by a moderator when the post report does not exist
  // 1. Moderator joins and logs in
  // 2. User joins and logs in
  // 3. User creates a post
  // 4. User submits a post report
  // 5. Moderator attempts to delete a post report with a randomly generated non-existent UUID
  // 6. Verify error handling of deletion attempt
  // 1. Moderator joins
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  // Generate consistent moderator credentials
  const moderatorJoinBody: ICommunityPlatformModerator.IJoin = typia.random<ICommunityPlatformModerator.IJoin>();
  const moderatorJoinData = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: moderatorJoinBody,
    },
  );
  typia.assert(moderatorJoinData);
  // 2. Moderator login with same credentials
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const moderatorLoginData = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: moderatorJoinBody as ICommunityPlatformModerator.ILogin,
    },
  );
  typia.assert(moderatorLoginData);
  moderatorLoginConnection.headers = {
    Authorization: moderatorLoginData.token.access,
  };
  // 3. User joins
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoinBody: ICommunityPlatformUser.IJoin = typia.random<ICommunityPlatformUser.IJoin>();
  const userJoinData = await authorize_user_join(userJoinConnection, {
    body: userJoinBody,
  });
  typia.assert(userJoinData);
  // 4. User login with same credentials
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLoginData = await authorize_user_login(userLoginConnection, {
    body: userJoinBody as ICommunityPlatformUser.ILogin,
  });
  typia.assert(userLoginData);
  userLoginConnection.headers = {
    Authorization: userLoginData.token.access,
  };
  // 5. User creates a post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    post_type: "text",
    content: {
      text: RandomGenerator.paragraph({ sentences: 2 }),
    },
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    userLoginConnection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  // 6. User submits a post report
  const postReport =
    await generate_random_community_platform_user_post_reports_create(
      userLoginConnection,
      {
        body: {
          communityPlatformPostId: (post as any).id satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">,
        },
      },
    );
  typia.assert(postReport);
  // 7. Moderator attempts to delete a post report with a non-existent UUID
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent post report throws error",
    async () => {
      await api.functional.communityPlatform.moderator.post_reports.erase(
        moderatorLoginConnection,
        { postReportId: nonExistentUUID },
      );
    },
  );
}
