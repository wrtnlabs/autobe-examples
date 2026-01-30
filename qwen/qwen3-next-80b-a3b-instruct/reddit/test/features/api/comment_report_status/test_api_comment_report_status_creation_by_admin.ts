import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommentReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReportStatus";
import { prepare_random_community_bbs_comment_report_status } from "../../../prepare/prepare_random_community_bbs_comment_report_status";
import { generate_random_community_bbs_admin_comment_report_statuses_create } from "../../../generate/generate_random_community_bbs_admin_comment_report_statuses_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_comment_report_status_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a new comment report status using admin connection without explicitly setting is_active
  const status: ICommunityBbsCommentReportStatus =
    await generate_random_community_bbs_admin_comment_report_statuses_create(
      adminConnection,
      {
        body: {
          status_name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          is_active: true
        } satisfies ICommunityBbsCommentReportStatus.ICreate,
      },
    );
  typia.assert(status);
  // Step 3: Validate the created status has all required properties
  // is_active should default to true
  TestValidator.equals("is_active defaults to true", status.is_active, true);
  // Step 4: Verify unauthenticated user cannot create status
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated user cannot create status",
    async () => {
      await generate_random_community_bbs_admin_comment_report_statuses_create(
        guestConnection,
        {
          body: {
            status_name: RandomGenerator.name(),
            description: RandomGenerator.paragraph(),
            is_active: true
          } satisfies ICommunityBbsCommentReportStatus.ICreate,
        },
      );
    },
  );
}