import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_review_report_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    href: "https://example.com/admin-join",
    referrer: "https://example.com",
    ip: "192.168.1.1",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.shoppingMall.auth.admin.join(adminConnection, {
      body: adminCredentials,
    });
  typia.assert(admin);
  // Generate valid UUIDs for successful deletion
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 1. Test successful report deletion by admin
  await api.functional.shoppingMall.admin.reviews.reports.erase(
    adminConnection,
    {
      reviewId,
      reportId,
    },
  );
  // 2. Test deletion fails with non-existent reportId (404)
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return 404 when reportId doesn't exist",
    async () => {
      await api.functional.shoppingMall.admin.reviews.reports.erase(
        adminConnection,
        {
          reviewId,
          reportId: nonExistentReportId,
        },
      );
    },
  );
  // 3. Test deletion fails with non-existent reviewId (404)
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return 404 when reviewId doesn't exist",
    async () => {
      await api.functional.shoppingMall.admin.reviews.reports.erase(
        adminConnection,
        {
          reviewId: nonExistentReviewId,
          reportId,
        },
      );
    },
  );
  // 4. Test deletion fails without authentication (401)
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "should return 401 without authentication",
    async () => {
      await api.functional.shoppingMall.admin.reviews.reports.erase(
        guestConnection,
        {
          reviewId,
          reportId,
        },
      );
    },
  );
}
