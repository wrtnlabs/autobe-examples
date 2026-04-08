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

export async function test_api_moderator_role_retrieve_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a community with owner role
  // Note: Community creation endpoint not available in SDK, skip this step
  // Use a randomly generated UUID for testing the retrieval endpoint
  const roleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve moderator role (owner)
  const role = await api.functional.redditCommunity.admin.moderator_roles.at(
    adminConnection,
    { roleId },
  );
  typia.assert(role);
  // 4. Validate response data
  TestValidator.equals("role is owner", role.role, "owner");
  TestValidator.equals("role id matches", role.id, roleId);
  TestValidator.equals(
    "community exists",
    role.community.id !== undefined,
    true,
  );
  TestValidator.equals("member exists", role.member.id !== undefined, true);
  TestValidator.equals("created_at valid", role.created_at !== undefined, true);
  TestValidator.equals("updated_at valid", role.updated_at !== undefined, true);
  TestValidator.equals("deleted_at is null", role.deleted_at, null);
  // 5. Validate community summary
  typia.assert(role.community);
  const community = role.community;
  TestValidator.equals("community id valid", community.id !== undefined, true);
  TestValidator.equals(
    "community name exists",
    community.name !== undefined,
    true,
  );
  TestValidator.equals(
    "community created_at valid",
    community.created_at !== undefined,
    true,
  );
  // 6. Validate member summary
  typia.assert(role.member);
  const member = role.member;
  TestValidator.equals("member id valid", member.id !== undefined, true);
  TestValidator.equals(
    "member username exists",
    member.username !== undefined,
    true,
  );
  TestValidator.equals(
    "member created_at valid",
    member.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "member updated_at valid",
    member.updated_at !== undefined,
    true,
  );
}
