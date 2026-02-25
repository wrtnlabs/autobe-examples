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

export async function test_api_community_flair_duplicate_display_text_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Create a community
  const community =
    await api.functional.communityPlatform.user.communities.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create first flair with specific display_text
  const displayText = RandomGenerator.alphabets(8);
  const firstFlair =
    await api.functional.communityPlatform.admin.communities.flairs.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          display_text: displayText,
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
      },
    );
  typia.assert(firstFlair);
  // Attempt to create second flair with same display_text - should fail with 409
  await TestValidator.httpError(
    "duplicate display_text should fail with 409",
    409,
    async () => {
      await api.functional.communityPlatform.admin.communities.flairs.create(
        adminConnection,
        {
          communityId: community.id,
          body: {
            display_text: displayText,
            is_active: true,
          } satisfies ICommunityPlatformCommunityFlair.ICreate,
        },
      );
    },
  );
  // Validate first flair exists correctly
  TestValidator.equals(
    "first flair display_text",
    firstFlair.display_text,
    displayText,
  );
  TestValidator.predicate("first flair is active", firstFlair.is_active);
  TestValidator.equals(
    "first flair community",
    firstFlair.community.id,
    community.id,
  );
}
