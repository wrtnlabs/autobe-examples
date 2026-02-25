import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
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
import { generate_random_community_platform_user_comment_reports_create } from "../../../generate/generate_random_community_platform_user_comment_reports_create";
import { prepare_random_community_platform_comment_report } from "../../../prepare/prepare_random_community_platform_comment_report";

export async function test_api_comment_report_prevention_of_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // 1. User Join and Authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  // Update connection headers with authentication token
  userConnection.headers = {
    Authorization: authorizedUser.token.access,
  };
  // 2. Create initial comment report
  const initialReport =
    await generate_random_community_platform_user_comment_reports_create(
      userConnection,
      {},
    );
  typia.assert(initialReport);
  // 3. Attempt to create duplicate report for the same comment by the same user
  // The duplicate report should raise an error indicating the duplication
  await TestValidator.error("duplicate comment report", async () => {
    await generate_random_community_platform_user_comment_reports_create(
      userConnection,
      {
        body: {
          comment_id: initialReport.comment.id,
          report_reason_id: initialReport.reportReason?.id ?? null,
          description: initialReport.description ?? null,
        },
      },
    );
  });
}
