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

export async function test_api_community_flair_creation_with_styling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platform administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: "admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a community for flair creation
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create flair with custom styling
  const flairBody: ICommunityPlatformCommunityFlair.ICreate = {
    display_text: RandomGenerator.paragraph({ sentences: 1 }),
    background_color: "#FF5733",
    text_color: "#FFFFFF",
    css_class: "custom-flair-style",
    is_active: true,
  } satisfies ICommunityPlatformCommunityFlair.ICreate;
  const flair =
    await generate_random_community_platform_admin_communities_flairs_create(
      adminConnection,
      {
        body: flairBody,
        params: { communityId: community.id },
      },
    );
  typia.assert(flair);
  // 4. Validate response
  TestValidator.equals(
    "display_text matches",
    flair.display_text,
    flairBody.display_text,
  );
  TestValidator.equals(
    "background_color matches",
    flair.background_color,
    flairBody.background_color,
  );
  TestValidator.equals(
    "text_color matches",
    flair.text_color,
    flairBody.text_color,
  );
  TestValidator.equals(
    "css_class matches",
    flair.css_class,
    flairBody.css_class,
  );
  TestValidator.equals("is_active is true", flair.is_active, true);
  TestValidator.predicate("has generated id", flair.id.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    flair.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    flair.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", flair.deleted_at, null);
  TestValidator.predicate(
    "has community summary",
    flair.community.id.length > 0,
  );
  TestValidator.equals(
    "community id matches",
    flair.community.id,
    community.id,
  );
}
