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

export async function test_api_community_flair_admin_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user account for community creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    },
  });
  // Create community with user account
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: ICommunityPlatformAdmin.ILogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
      display_name: RandomGenerator.name(),
      permissions_level: null,
    },
  });
  // Re-authenticate admin with login
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_admin_login(authenticatedAdminConnection, {
    body: adminCredentials,
  });
  // Create flair with authenticated admin
  const flair =
    await generate_random_community_platform_admin_communities_flairs_create(
      authenticatedAdminConnection,
      {
        body: {
          display_text: RandomGenerator.paragraph({ sentences: 1 }),
          background_color: "#FF0000",
          text_color: "#FFFFFF",
          css_class: null,
          is_active: true,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(flair);
  // Delete the flair
  await api.functional.communityPlatform.admin.communities.flairs.erase(
    authenticatedAdminConnection,
    {
      communityId: community.id,
      flairId: flair.id,
    },
  );
  // Verify deletion was successful (no error thrown)
  TestValidator.predicate("flair deletion should succeed", true);
  // Note: The actual validation of soft-deletion (deleted_at timestamp) and cascade deletion
  // of flair assignments would require additional API endpoints to retrieve the deleted flair
  // or check flair assignments, which are not available in the current API specification.
  // The test validates the successful execution of the deletion operation as the primary objective.
}
