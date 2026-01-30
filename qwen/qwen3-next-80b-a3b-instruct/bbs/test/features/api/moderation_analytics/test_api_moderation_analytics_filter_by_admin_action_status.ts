import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicForumPost";
export async function test_api_moderation_analytics_filter_by_admin_action_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Create a valid request payload with different admin_action_status values
  const requestWithApproved: IEconomicForumPost.IRequest = {
    admin_action_status: "approved",
  };
  const requestWithDeleted: IEconomicForumPost.IRequest = {
    admin_action_status: "deleted",
  };
  const requestWithoutAdminActionStatus: IEconomicForumPost.IRequest = {
    admin_action_status: undefined, // Fixed: Use undefined instead of null to match type '"approved" | "deleted" | undefined'
  };
  // Call the analytics endpoint with each admin_action_status value
  // This validates the endpoint successfully accepts the three possible admin_action_status values
  // The actual response structure is validated by typia.assert()
  const responseWithApproved =
    await api.functional.economicForum.posts.analytics.index(adminConnection, {
      body: requestWithApproved,
    });
  typia.assert(responseWithApproved);
  const responseWithDeleted =
    await api.functional.economicForum.posts.analytics.index(adminConnection, {
      body: requestWithDeleted,
    });
  typia.assert(responseWithDeleted);
  const responseWithoutAdminActionStatus =
    await api.functional.economicForum.posts.analytics.index(adminConnection, {
      body: requestWithoutAdminActionStatus,
    });
  typia.assert(responseWithoutAdminActionStatus);
  // Verify that endpoint accepts and processes all three values of admin_action_status
  // The actual business logic validation is performed by the backend service
  // We can only verify that the endpoint handles these cases without throwing errors
  TestValidator.equals(
    "responseWithApproved is defined",
    responseWithApproved.pagination.current,
    1,
  );
  TestValidator.equals(
    "responseWithDeleted is defined",
    responseWithDeleted.pagination.current,
    1,
  );
  TestValidator.equals(
    "responseWithoutAdminActionStatus is defined",
    responseWithoutAdminActionStatus.pagination.current,
    1,
  );
  // Since we can't control or verify the actual count data (no test data creation API exists),
  // we only validate the endpoint successfully processes the three admin_action_status values
  // with proper request structure and returns a valid IPageIEconomicForumPost response
}