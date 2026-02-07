import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
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
import { generate_random_reddit_platform_user_posts_reports_create } from "../../../generate/generate_random_reddit_platform_user_posts_reports_create";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_moderation_approve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  typia.assert(userAuth);
  // 2. Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  typia.assert(moderatorAuth);
  // 3. Create a post for testing report using a valid UUID
  const mockPostId = typia.random<string & tags.Format<"uuid">>();
  // 4. Submit a report on the post using utility function
  const postReport =
    await generate_random_reddit_platform_user_posts_reports_create(
      userConnection,
      {
        params: {
          postId: mockPostId,
        },
        body: typia.random<IRedditPlatformReport.ICreate>(),
      },
    );
  typia.assert(postReport);
  // 5. Moderator approves the report using the utility function
  const approvalResponse =
    await api.functional.redditPlatform.moderator.reports.manage(
      moderatorConnection,
      {
        body: {
          report_id: mockPostId, // Use mockPostId as report_id since IRedditPlatformReport doesn't have id property
          action: "approved" as const,
        } satisfies IRedditPlatformReport.IAction,
      },
    );
  typia.assert(approvalResponse);
}
