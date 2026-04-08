import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderator_role_retrieve_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a valid moderator role UUID for testing
  const moderatorRoleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call GET /redditCommunity/admin/moderator-roles/{roleId}
  const role = await api.functional.redditCommunity.admin.moderator_roles.at(
    adminConnection,
    {
      roleId: moderatorRoleId,
    },
  );
  typia.assert(role);
  // 4. Validate role type is 'moderator'
  TestValidator.equals("role type is moderator", role.role, "moderator");
  // 5. Validate role is not 'owner'
  TestValidator.notEquals("role is not owner", role.role, "owner");
  // 6. Validate community relation exists and contains summary data
  TestValidator.equals(
    "community id exists",
    role.community.id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals(
    "community name exists",
    role.community.name,
    typia.random<string>(),
  );
  TestValidator.equals(
    "community description can be null",
    role.community.description,
    typia.random<string | null>(),
  );
  TestValidator.equals(
    "community subscriber count can be null",
    role.community.subscriber_count,
    typia.random<number | null>(),
  );
  TestValidator.equals(
    "community created_at exists",
    role.community.created_at,
    typia.random<string & tags.Format<"date-time">>(),
  );
  TestValidator.equals(
    "community deleted_at is null",
    role.community.deleted_at,
    null,
  );
  // 7. Validate member relation exists and contains summary data
  TestValidator.equals(
    "member id exists",
    role.member.id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals(
    "member username exists",
    role.member.username,
    typia.random<string>(),
  );
  TestValidator.equals(
    "member created_at exists",
    role.member.created_at,
    typia.random<string & tags.Format<"date-time">>(),
  );
  TestValidator.equals(
    "member updated_at exists",
    role.member.updated_at,
    typia.random<string & tags.Format<"date-time">>(),
  );
  // 8. Validate role timestamps
  TestValidator.equals(
    "role created_at exists",
    role.created_at,
    typia.random<string & tags.Format<"date-time">>(),
  );
  TestValidator.equals(
    "role updated_at exists",
    role.updated_at,
    typia.random<string & tags.Format<"date-time">>(),
  );
  TestValidator.equals("role deleted_at is null", role.deleted_at, null);
  // 9. Validate role id exists
  TestValidator.equals(
    "role id exists",
    role.id,
    typia.random<string & tags.Format<"uuid">>(),
  );
}
