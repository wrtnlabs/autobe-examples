import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
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
import { generate_random_community_platform_user_comment_reports_create_comment_report } from "../../../generate/generate_random_community_platform_user_comment_reports_create_comment_report";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_report } from "../../../prepare/prepare_random_community_platform_comment_report";

export async function test_api_comment_report_creation_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. User join and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, { body: {} });
  typia.assert(userAuth);
  userConnection.headers = { Authorization: `Bearer ${userAuth.token.access}` };

  // 2. Create a comment to be reported
  const commentRaw = await generate_random_community_platform_user_comments_create(
    userConnection,
    { body: {} },
  );
  // Assert that it has 'id' property
  const comment = typia.assert<
    ICommunityPlatformComment & { id: string }
  >(commentRaw) satisfies ICommunityPlatformComment & { id: string };

  // 3. Scenario 1: Successfully creating a new comment report
  const reportRaw = await generate_random_community_platform_user_comment_reports_create_comment_report(
    userConnection,
    {
      body: {
        comment_id: comment.id,
        description: "Inappropriate content due to spam",
      },
    },
  );
  // Assert that report has 'status' and 'comment_id'
  const report1 = typia.assert<
    ICommunityPlatformCommentReport & { status: string; comment_id: string }
  >(reportRaw) satisfies ICommunityPlatformCommentReport & { status: string; comment_id: string };

  TestValidator.equals("report status is 'pending'", report1.status, "pending");
  TestValidator.equals(
    "report comment_id matches",
    report1.comment_id,
    comment.id,
  );

  // 4. Scenario 2: Attempt duplicate report creation on the same comment by the same user
  await TestValidator.error(
    "duplicate report creation should fail",
    async () => {
      await generate_random_community_platform_user_comment_reports_create_comment_report(
        userConnection,
        {
          body: {
            comment_id: comment.id,
            description: "Duplicate report attempt",
          },
        },
      );
    },
  );

  // 5. Scenario 3: Creating report with invalid comment ID
  await TestValidator.error(
    "report creation with invalid comment ID should fail",
    async () => {
      await generate_random_community_platform_user_comment_reports_create_comment_report(
        userConnection,
        {
          body: {
            comment_id: "00000000-0000-0000-0000-000000000000",
            description: "Invalid comment ID",
          },
        },
      );
    },
  );
}
