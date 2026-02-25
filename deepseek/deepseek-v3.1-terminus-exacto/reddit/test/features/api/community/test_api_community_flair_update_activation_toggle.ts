import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_communities_flairs_create } from "../../../generate/generate_random_community_platform_admin_communities_flairs_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_flair } from "../../../prepare/prepare_random_community_platform_community_flair";

export async function test_api_community_flair_update_activation_toggle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. User authentication and community creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 3. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created successfully",
    community.name.length > 0,
    true,
  );
  // 4. Create initial flair
  const initialFlair =
    await generate_random_community_platform_admin_communities_flairs_create(
      adminConnection,
      {
        body: {
          display_text: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 4,
          }),
          background_color: "#FF5733",
          text_color: "#FFFFFF",
          css_class: "premium-flair",
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(initialFlair);
  TestValidator.equals("initial flair active", initialFlair.is_active, true);
  // 5. Test activation toggle workflow
  // First toggle: active → inactive
  const deactivatedFlair =
    await api.functional.communityPlatform.admin.communities.flairs.update(
      adminConnection,
      {
        communityId: community.id,
        flairId: initialFlair.id,
        body: {
          is_active: false,
        } satisfies ICommunityPlatformCommunityFlair.IUpdate,
      },
    );
  typia.assert(deactivatedFlair);
  TestValidator.equals("flair deactivated", deactivatedFlair.is_active, false);
  // Second toggle: inactive → active
  const reactivatedFlair =
    await api.functional.communityPlatform.admin.communities.flairs.update(
      adminConnection,
      {
        communityId: community.id,
        flairId: initialFlair.id,
        body: {
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.IUpdate,
      },
    );
  typia.assert(reactivatedFlair);
  TestValidator.equals("flair reactivated", reactivatedFlair.is_active, true);
  // 6. Validate other properties remain unchanged
  TestValidator.equals(
    "display text unchanged",
    reactivatedFlair.display_text,
    initialFlair.display_text,
  );
  TestValidator.equals(
    "background color unchanged",
    reactivatedFlair.background_color,
    initialFlair.background_color,
  );
  TestValidator.equals(
    "text color unchanged",
    reactivatedFlair.text_color,
    initialFlair.text_color,
  );
  TestValidator.equals(
    "css class unchanged",
    reactivatedFlair.css_class,
    initialFlair.css_class,
  );
  TestValidator.equals(
    "community ID unchanged",
    reactivatedFlair.community.id,
    initialFlair.community.id,
  );
}
