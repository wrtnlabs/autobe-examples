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

export async function test_api_admin_moderator_hierarchy_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Since we cannot create communities or moderator assignments with the available APIs,
  // we'll test the endpoint with valid data that should exist in the test environment.
  // The test environment should have pre-existing communities and moderator assignments.
  // 2. Test viewing a moderator assignment with valid IDs
  // These IDs should correspond to existing data in the test database
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to view the moderator assignment
  const moderator =
    await api.functional.communityPlatform.admin.communities.moderators.at(
      adminConnection,
      {
        communityId,
        moderatorId,
      },
    );
  typia.assert(moderator);
  // 4. Validate business logic - the moderator assignment should have proper hierarchy information
  TestValidator.predicate(
    "moderator assignment has valid role level",
    moderator.role_level.length > 0,
  );
  TestValidator.predicate(
    "moderator assignment has valid assignment date",
    moderator.assigned_at.length > 0,
  );
  TestValidator.predicate(
    "moderator user has valid profile",
    moderator.user.username.length > 0,
  );
  TestValidator.predicate(
    "moderator community has valid information",
    moderator.community.name.length > 0 &&
      moderator.community.description.length > 0,
  );
  TestValidator.predicate(
    "moderator assigned by has valid profile",
    moderator.assigned_by.username.length > 0,
  );
}
