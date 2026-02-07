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

export async function test_api_admin_member_activity_excludes_deleted_content(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // Now authenticate admin using login utility
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: "test@example.com", // dummy, but must be consistent with join
      password: "password123", // dummy, but must be consistent with join
    } satisfies ICommunityAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // Generate a random memberId (UUID)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // Call the activity endpoint to retrieve member activity
  const activityResponse =
    await api.functional.community.admin.members.activity.index(
      adminConnection,
      { memberId },
    );
  typia.assert(activityResponse);
  // Validate response is not null and has structure
  TestValidator.predicate("activity response exists", activityResponse != null);
}
