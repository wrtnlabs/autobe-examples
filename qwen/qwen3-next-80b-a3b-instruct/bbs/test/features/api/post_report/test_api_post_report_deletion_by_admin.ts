import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_post_report_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection to authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate random admin credentials for join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // Step 3: Authenticate admin via join to get authorization
  const adminAuth: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IEconomicForumAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 4: Generate random postId and reportId (assuming they exist in DB)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Step 5: Delete report once → if exists, returns 204 (no content), navigating to non-existence
  await api.functional.economicForum.admin.posts.reports.erase(
    adminConnection,
    {
      postId: postId,
      reportId: reportId,
    },
  );
  // Step 6: Delete the same report again → should return 404 Not Found because it doesn't exist
  await TestValidator.error(
    "deleting already-deleted report should return 404",
    async () => {
      await api.functional.economicForum.admin.posts.reports.erase(
        adminConnection,
        {
          postId: postId,
          reportId: reportId,
        },
      );
    },
  );
}
