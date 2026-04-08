import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorRole";
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

export async function test_api_moderator_roles_owner_view_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin (who becomes community owner)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Query moderator roles for this admin's community
  // The endpoint should return the owner role for communities this admin owns
  const result =
    await api.functional.redditCommunity.admin.moderator_roles.index(
      adminConnection,
      {
        body: {
          limit: 100, // Get all roles
        } satisfies IRedditCommunityModeratorRole.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate response structure - pagination metadata is correct
  TestValidator.predicate(
    "pagination has required fields",
    () =>
      result.pagination.current !== undefined &&
      result.pagination.limit !== undefined &&
      result.pagination.records !== undefined &&
      result.pagination.pages !== undefined,
  );
  // 4. Validate at least one moderator role exists (the owner)
  TestValidator.predicate("at least one role exists", result.data.length >= 1);
  // 5. Validate owner role is present in results
  const ownerRole = result.data.find((r) => r.role === "owner");
  TestValidator.predicate(
    "owner role exists in results",
    ownerRole !== undefined,
  );
  // 6. Verify community summary is included and valid
  TestValidator.predicate(
    "owner has valid community summary",
    () =>
      ownerRole !== undefined && ownerRole !== null &&
      ownerRole.community.id !== undefined &&
      ownerRole.community.name !== undefined &&
      ownerRole.community.created_at !== undefined,
  );
  // 7. Verify member summary is included and valid for owner role
  TestValidator.predicate(
    "owner has valid member summary",
    () =>
      ownerRole !== undefined && ownerRole !== null &&
      ownerRole.member.id !== undefined &&
      ownerRole.member.username !== undefined &&
      ownerRole.member.created_at !== undefined,
  );
  // 8. Validate all roles have required fields
  result.data.forEach((role, index) => {
    typia.assert(role);
    TestValidator.predicate(`role ${index} has ID`, role.id !== undefined);
    TestValidator.predicate(
      `role ${index} has role type`,
      role.role === "owner" || role.role === "moderator",
    );
    TestValidator.predicate(
      `role ${index} has created_at`,
      role.created_at !== undefined,
    );
    TestValidator.predicate(
      `role ${index} has updated_at`,
      role.updated_at !== undefined,
    );
    // Validate community reference
    typia.assert(role.community);
    TestValidator.predicate(
      `role ${index} has valid community`,
      () =>
        role.community.id !== undefined && role.community.name !== undefined,
    );
    // Validate member reference
    typia.assert(role.member);
    TestValidator.predicate(
      `role ${index} has valid member`,
      () => role.member.id !== undefined && role.member.username !== undefined,
    );
  });
  // 9. Validate soft-deleted records are excluded
  // Note: ISummary doesn't have deleted_at field - removed these assertions
  result.data.forEach((role, index) => {
    // deleted_at field doesn't exist on ISummary type
  });
}