import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_moderation_roles_reconcile_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that an authenticated admin can reconcile moderation roles for a community.
   * The test authenticates a new admin connection, calls the community moderation-role
   * PATCH endpoint with a valid request body, and validates the paginated moderation-role
   * response structure returned by the API.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234" satisfies string &
        tags.MinLength<1> &
        tags.Format<"password">,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const response =
    await api.functional.communityPlatform.admin.communities.moderationRoles.index(
      adminConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          communityPlatformMemberId: typia.random<
            string & tags.Format<"uuid">
          >(),
          roleType: "moderator",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "response should contain pagination metadata",
    response.pagination.current >= 0 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response should contain a moderation role list",
    Array.isArray(response.data),
  );
  if (response.data.length > 0) {
    const role = response.data[0];
    typia.assert(role);
    TestValidator.equals(
      "role community summary exists",
      role.community.id,
      role.community.id,
    );
    TestValidator.equals(
      "role member summary exists",
      role.member,
      role.member,
    );
    TestValidator.equals(
      "role type is preserved",
      role.role_type,
      role.role_type,
    );
  }
}
