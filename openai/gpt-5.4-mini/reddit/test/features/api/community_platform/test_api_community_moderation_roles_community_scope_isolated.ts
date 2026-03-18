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

export async function test_api_community_moderation_roles_community_scope_isolated(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.assert<string & tags.MinLength<1> & tags.Format<"password">>(
        typia.random<string>(),
      ),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const communityAId = typia.random<string & tags.Format<"uuid">>();
  const communityBId = typia.random<string & tags.Format<"uuid">>();
  const memberAId = typia.random<string & tags.Format<"uuid">>();
  const memberBId = typia.random<string & tags.Format<"uuid">>();
  const ownerId = typia.random<string & tags.Format<"uuid">>();
  const communityA =
    await api.functional.communityPlatform.admin.communities.moderationRoles.index(
      adminConnection,
      {
        communityId: communityAId,
        body: {
          communityPlatformMemberId: memberAId,
          roleType: "moderator",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(communityA);
  const communityB =
    await api.functional.communityPlatform.admin.communities.moderationRoles.index(
      adminConnection,
      {
        communityId: communityBId,
        body: {
          communityPlatformMemberId: memberBId,
          roleType: "moderator",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(communityB);
  const ownerAttempt =
    await api.functional.communityPlatform.admin.communities.moderationRoles.index(
      adminConnection,
      {
        communityId: communityAId,
        body: {
          communityPlatformMemberId: ownerId,
          roleType: "moderator",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(ownerAttempt);
  TestValidator.equals(
    "community A pagination current page",
    communityA.pagination.current,
    1,
  );
  TestValidator.equals(
    "community A pagination limit",
    communityA.pagination.limit,
    100,
  );
  TestValidator.equals(
    "community B pagination current page",
    communityB.pagination.current,
    1,
  );
  TestValidator.equals(
    "community B pagination limit",
    communityB.pagination.limit,
    100,
  );
  TestValidator.equals(
    "owner attempt pagination current page",
    ownerAttempt.pagination.current,
    1,
  );
  TestValidator.equals(
    "owner attempt pagination limit",
    ownerAttempt.pagination.limit,
    100,
  );
  TestValidator.notEquals(
    "different communities should not share the same moderation-role page payload",
    communityA,
    communityB,
  );
  TestValidator.notEquals(
    "owner-related request should not alter the target community response payload",
    communityA,
    ownerAttempt,
  );
  TestValidator.predicate(
    "target community response should be a paginated list",
    Array.isArray(communityA.data) &&
      Array.isArray(communityB.data) &&
      Array.isArray(ownerAttempt.data),
  );
}
