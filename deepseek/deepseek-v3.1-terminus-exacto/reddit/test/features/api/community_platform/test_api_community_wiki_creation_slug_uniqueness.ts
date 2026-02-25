import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityWiki";
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
import { generate_random_community_platform_admin_communities_wikis_create } from "../../../generate/generate_random_community_platform_admin_communities_wikis_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_wiki } from "../../../prepare/prepare_random_community_platform_community_wiki";

export async function test_api_community_wiki_creation_slug_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create two communities for testing using SDK (no utility function available)
  const community1 =
    await api.functional.communityPlatform.user.communities.create(
      adminConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  const community2 =
    await api.functional.communityPlatform.user.communities.create(
      adminConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // Test 1: Same slug in different communities should succeed
  const commonSlug = typia.random<string>();
  const wiki1 =
    await generate_random_community_platform_admin_communities_wikis_create(
      adminConnection,
      {
        params: { communityId: community1.id },
        body: {
          title: typia.random<string>(),
          slug: commonSlug,
          content: typia.random<string>(),
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(wiki1);
  const wiki2 =
    await generate_random_community_platform_admin_communities_wikis_create(
      adminConnection,
      {
        params: { communityId: community2.id },
        body: {
          title: typia.random<string>(),
          slug: commonSlug,
          content: typia.random<string>(),
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(wiki2);
  TestValidator.equals(
    "same slug in different communities",
    wiki1.slug,
    wiki2.slug,
  );
  // Test 2: Duplicate slug in same community should fail
  await TestValidator.error("duplicate slug in same community", async () => {
    await generate_random_community_platform_admin_communities_wikis_create(
      adminConnection,
      {
        params: { communityId: community1.id },
        body: {
          title: typia.random<string>(),
          slug: commonSlug,
          content: typia.random<string>(),
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  });
  // Test 3: Different slug in same community should succeed
  const differentSlug = typia.random<string>();
  const wiki3 =
    await generate_random_community_platform_admin_communities_wikis_create(
      adminConnection,
      {
        params: { communityId: community1.id },
        body: {
          title: typia.random<string>(),
          slug: differentSlug,
          content: typia.random<string>(),
        } satisfies ICommunityPlatformCommunityWiki.ICreate,
      },
    );
  typia.assert(wiki3);
  TestValidator.notEquals(
    "different slug should be unique",
    wiki3.slug,
    commonSlug,
  );
}
