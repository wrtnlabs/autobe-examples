import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_moderator_assignment_user_data(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate random UUIDs for community and moderator
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve moderator assignment details
  const moderatorAssignment =
    await api.functional.communityPlatform.admin.communities.moderators.at(
      adminConnection,
      {
        communityId,
        moderatorId,
      },
    );
  typia.assert(moderatorAssignment);
  // Validate user profile structure exists
  TestValidator.predicate(
    "user profile exists",
    moderatorAssignment.user !== undefined,
  );
  TestValidator.predicate(
    "community profile exists",
    moderatorAssignment.community !== undefined,
  );
  TestValidator.predicate(
    "assigned_by profile exists",
    moderatorAssignment.assigned_by !== undefined,
  );
  // Validate moderator assignment metadata completeness
  TestValidator.predicate(
    "moderator assignment has valid id",
    moderatorAssignment.id !== undefined,
  );
  TestValidator.predicate(
    "moderator assignment has assignment timestamp",
    moderatorAssignment.assigned_at !== undefined,
  );
  TestValidator.predicate(
    "moderator assignment has role level",
    moderatorAssignment.role_level !== undefined,
  );
  TestValidator.predicate(
    "moderator assignment has active status",
    moderatorAssignment.is_active !== undefined,
  );
}
