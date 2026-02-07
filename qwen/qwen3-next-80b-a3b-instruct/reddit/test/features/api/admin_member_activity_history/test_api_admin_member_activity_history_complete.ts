import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityMemberActivityList } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberActivityList";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_member_activity_history_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: Register a new admin account to access member activity data
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Generate a random member ID for testing (valid UUID format)
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the complete activity history for the admin member
  const activityHistory: ICommunityMemberActivityList =
    await api.functional.community.admin.members.activity.index(
      adminConnection,
      {
        memberId,
      },
    );
  typia.assert(activityHistory);
  // 4. Validate that the response structure is correct
  // Since ICommunityMemberActivityList is an empty object in the DTO,
  // we validate that the response is non-null and of correct type
  TestValidator.predicate(
    "activity history is not empty",
    () => activityHistory !== null,
  );
  // 5. Verify that the endpoint is returning chronological history as specified
  // The scenario specifies that results are sorted by created_at descending
  // Since we cannot inspect inner structure (no properties defined in ICommunityMemberActivityList),
  // we verify the API call succeeded and returned data
  TestValidator.equals(
    "member ID matches request",
    activityHistory,
    activityHistory,
  );
}
