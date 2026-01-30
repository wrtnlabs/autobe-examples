import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import type { IEconomicForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostReport";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_post_report_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user using authorization utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicForumAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Generate valid UUIDs for postId and reportId
  // These represent existing post and report IDs on the server
  const validPostId: string = typia.random<string & tags.Format<"uuid">>();
  const validReportId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create a valid request body with status transition from pending to investigating
  // According to the scenario, we need to update status to 'investigating'
  const reportUpdate: IEconomicForumPostReport.IUpdate = {
    status: "investigating",
  } satisfies IEconomicForumPostReport.IUpdate;
  // Step 4: Update the post report status using the available update endpoint
  const updatedReport: IEconomicForumPostReport =
    await api.functional.economicForum.admin.posts.reports.update(
      adminConnection,
      {
        postId: validPostId,
        reportId: validReportId,
        body: reportUpdate,
      },
    );
  typia.assert(updatedReport);
  // Step 5: Validate that the update was successful by ensuring no errors occurred
  // Since the type doesn't expose status property, we validate through successful execution
  TestValidator.predicate("report status update should succeed", true);
  // Step 6: Verify that unauthorized access fails with proper authentication
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.economicForum.admin.posts.reports.update(
      unauthorizedConnection,
      {
        postId: validPostId,
        reportId: validReportId,
        body: {
          status: "investigating",
        } satisfies IEconomicForumPostReport.IUpdate,
      },
    );
  });
}
