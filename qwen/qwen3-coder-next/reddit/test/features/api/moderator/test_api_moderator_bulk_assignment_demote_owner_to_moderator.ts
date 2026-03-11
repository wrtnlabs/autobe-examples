import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_admin_communities_moderator_roles_create } from "../../../generate/generate_random_reddit_like_admin_communities_moderator_roles_create";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";

export async function test_api_moderator_bulk_assignment_demote_owner_to_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = typia.random<IRedditLikeAdmin.IJoin>();
  await authorize_admin_join(adminConnection, { body: adminUser });
  // 2. Create first moderator (will become owner)
  const mod1Connection: api.IConnection = { host: connection.host };
  const mod1User = typia.random<IRedditLikeModerator.IJoin>();
  const mod1 = await authorize_moderator_join(mod1Connection, {
    body: mod1User,
  });
  // 3. Create second moderator (will remain as moderator)
  const mod2Connection: api.IConnection = { host: connection.host };
  const mod2User = typia.random<IRedditLikeModerator.IJoin>();
  const mod2 = await authorize_moderator_join(mod2Connection, {
    body: mod2User,
  });
  // 4. Generate community data (no creation API available)
  const community = typia.random<IRedditLikeCommunity.ISummary>();
  // 5. Admin assigns owner role to mod1
  const ownerRole =
    await api.functional.redditLike.admin.communities.moderator_roles.create(
      adminConnection,
      {
        communityId: community.name,
        body: {
          user_id: mod1.id,
          community_id: community.name,
          role: "owner",
        } satisfies IRedditLikeModeratorRole.ICreate,
      },
    );
  typia.assert(ownerRole);
  // 6. Admin adds mod2 as moderator
  const modRole =
    await api.functional.redditLike.admin.communities.moderator_roles.create(
      adminConnection,
      {
        communityId: community.name,
        body: {
          user_id: mod2.id,
          community_id: community.name,
          role: "moderator",
        } satisfies IRedditLikeModeratorRole.ICreate,
      },
    );
  typia.assert(modRole);
  // 7. Authenticate as mod1 (current owner) for bulk update
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(ownerConnection, {
    body: { email: mod1User.email, password: mod1User.password },
  });
  // 8. Execute bulk update: demote owner to moderator
  const result =
    await api.functional.redditLike.moderator.communities.moderator_roles.updateModeratorRoles(
      ownerConnection,
      {
        communityId: community.name,
        body: {
          user_id: mod1.id,
          role: "moderator",
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(result);
  // 9. Validate result (using ISummary properties only: id, role, created_at)
  TestValidator.equals("owner demoted to moderator", result.data.length, 2);
  const updatedOwnerRole = result.data.find((r) => r.id === ownerRole.id);
  TestValidator.equals(
    "mod1 role changed to moderator",
    updatedOwnerRole?.role,
    "moderator",
  );
  const updatedModRole = result.data.find((r) => r.id === modRole.id);
  TestValidator.equals(
    "mod2 role unchanged",
    updatedModRole?.role,
    "moderator",
  );
}
