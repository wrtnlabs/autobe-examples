import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";

export async function test_api_reddit_community_admin_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join (register & authenticate)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const authorizedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(authorizedAdmin);

  // 2. Retrieve admin detail by admin ID
  const adminDetail: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.at(
      connection,
      { id: authorizedAdmin.id },
    );
  typia.assert(adminDetail);

  // 3. Validate important properties
  TestValidator.equals(
    "retrieved admin id matches authorized id",
    adminDetail.id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "retrieved admin email matches authorized email",
    adminDetail.email,
    authorizedAdmin.email,
  );
  TestValidator.predicate(
    "admin level is a valid positive integer",
    typeof adminDetail.admin_level === "number" && adminDetail.admin_level > 0,
  );
  TestValidator.predicate(
    "admin created_at is a string",
    typeof adminDetail.created_at === "string",
  );
  TestValidator.predicate(
    "admin updated_at is a string",
    typeof adminDetail.updated_at === "string",
  );
  TestValidator.predicate(
    "admin deleted_at is null or string",
    adminDetail.deleted_at === null ||
      adminDetail.deleted_at === undefined ||
      typeof adminDetail.deleted_at === "string",
  );
  TestValidator.predicate(
    "reddit_community_report_actions is undefined or array",
    adminDetail.reddit_community_report_actions === undefined ||
      Array.isArray(adminDetail.reddit_community_report_actions),
  );

  // 4. Unauthorized access check: try to fetch detail with a dummy connection without authentication
  const dummyConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to admin detail is rejected",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunityAdmins.at(
        dummyConnection,
        {
          id: authorizedAdmin.id,
        },
      );
    },
  );
}
