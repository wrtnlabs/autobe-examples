import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { generate_random_community_platform_user_comment_reports_create_comment_report } from "../../../generate/generate_random_community_platform_user_comment_reports_create_comment_report";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_report } from "../../../prepare/prepare_random_community_platform_comment_report";

export async function test_api_comment_report_update_invalid_status_or_reason(
  connection: api.IConnection,
): Promise<void> {
  // Moderator account setup
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: typia.random<
        import("@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator").ICommunityPlatformModerator.IJoin
      >(),
    },
  );
  typia.assert(moderatorJoin);
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, {
    body: typia.random<
      import("@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator").ICommunityPlatformModerator.ILogin
    >(),
  });
  // User account setup
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userJoinConnection, {
    body: typia.random<
      import("@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser").ICommunityPlatformUser.IJoin
    >(),
  });
  typia.assert(userJoin);
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: typia.random<
      import("@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser").ICommunityPlatformUser.ILogin
    >(),
  });
  // User creates a comment
  const comment = await generate_random_community_platform_user_comments_create(
    userConnection,
    {
      body: {},
    },
  ) as (ICommunityPlatformComment & { id: string & tags.Format<"uuid"> });
  typia.assert(comment);
  // User creates a comment report
  const report =
    await generate_random_community_platform_user_comment_reports_create_comment_report(
      userConnection,
      {
        body: {
          comment_id: comment.id,
          report_reason_id: null,
          description: null,
        },
      },
    ) as (ICommunityPlatformCommentReport & { id: string & tags.Format<"uuid"> });
  typia.assert(report);
  // Attempt to update with invalid status (enum violation) and invalid report_reason_id (non-existing)
  const invalidStatus = "invalid_status_value" as string;
  const invalidReasonId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      import("typia").tags.Format<"uuid">;
  // Invalid status update attempt
  await TestValidator.error("updating with invalid status string", async () => {
    await api.functional.communityPlatform.moderator.comment_reports.update(
      moderatorConnection,
      {
        commentReportId: report.id,
        body: {
          status: invalidStatus,
          report_reason_id: null,
          description: "Attempt updating with invalid status",
        },
      },
    );
  });
  // Invalid report_reason_id update attempt
  await TestValidator.error(
    "updating with non-existing report_reason_id",
    async () => {
      await api.functional.communityPlatform.moderator.comment_reports.update(
        moderatorConnection,
        {
          commentReportId: report.id,
          body: {
            status: "pending",
            report_reason_id: invalidReasonId,
            description: "Attempt updating with non-existing report_reason_id",
          },
        },
      );
    },
  );
}
