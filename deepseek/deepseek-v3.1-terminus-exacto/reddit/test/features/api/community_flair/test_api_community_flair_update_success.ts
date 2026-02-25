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

export async function test_api_community_flair_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using join (as specified in scenario)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create user connection for community creation (community creation requires user actor)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create a test community using user connection
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create initial flair using admin connection
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
          background_color: "#FF0000",
          text_color: "#FFFFFF",
          css_class: null,
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(initialFlair);
  // Update the flair with new values using admin connection
  const updateBody = {
    display_text: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 4,
    }),
    background_color: "#00FF00",
    text_color: "#000000",
    css_class: "custom-flair",
    is_active: false,
  } satisfies ICommunityPlatformCommunityFlair.IUpdate;
  const updatedFlair =
    await api.functional.communityPlatform.admin.communities.flairs.update(
      adminConnection,
      {
        communityId: community.id,
        flairId: initialFlair.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFlair);
  // Validate the updates
  TestValidator.equals(
    "display text updated",
    updatedFlair.display_text,
    updateBody.display_text,
  );
  TestValidator.equals(
    "background color updated",
    updatedFlair.background_color,
    updateBody.background_color,
  );
  TestValidator.equals(
    "text color updated",
    updatedFlair.text_color,
    updateBody.text_color,
  );
  TestValidator.equals(
    "css class updated",
    updatedFlair.css_class,
    updateBody.css_class,
  );
  TestValidator.equals(
    "is_active updated",
    updatedFlair.is_active,
    updateBody.is_active,
  );
  // Test unique display text constraint
  await TestValidator.error("duplicate display text should fail", async () => {
    await api.functional.communityPlatform.admin.communities.flairs.update(
      adminConnection,
      {
        communityId: community.id,
        flairId: initialFlair.id,
        body: {
          display_text: updatedFlair.display_text,
        } satisfies ICommunityPlatformCommunityFlair.IUpdate,
      },
    );
  });
}
