import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_update_public_identity_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // authorize_member_join updates memberConnection.headers.Authorization internally
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = member.token.access;
  // 2) Create Community A
  const communityA =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/icon/${RandomGenerator.alphabets(8)}.png`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // 3) Retrieve current identity fields
  const before = await api.functional.communityPlatform.communities.at(
    memberConnection,
    {
      communityId: communityA.id,
    },
  );
  typia.assert(before);
  const beforeUpdatedAt = before.updatedAt;
  const beforeCreatedAt = before.createdAt;
  const beforeDeletedAt = before.deletedAt;
  TestValidator.equals(
    "deletedAt is not set on active community",
    beforeDeletedAt,
    null,
  );
  // 4) Update via PUT with new unique name, description, icon
  const newName = `community-${RandomGenerator.alphabets(12)}`;
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const newIconHref = `https://example.com/icon/${RandomGenerator.alphabets(10)}.png`;
  const updated =
    await api.functional.communityPlatform.communities.updateCommunity(
      memberConnection,
      {
        communityId: communityA.id,
        body: {
          name: newName,
          description: newDescription,
          icon_href: newIconHref,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updated);
  // 5) Validate response identity fields and timestamps
  TestValidator.equals("name matches", updated.name, newName);
  TestValidator.equals(
    "description matches",
    updated.description,
    newDescription,
  );
  TestValidator.equals("iconHref matches", updated.iconHref, newIconHref);
  TestValidator.predicate(
    "updatedAt is later than before",
    new Date(updated.updatedAt).getTime() > new Date(beforeUpdatedAt).getTime(),
  );
  TestValidator.equals(
    "createdAt unchanged",
    updated.createdAt,
    beforeCreatedAt,
  );
  TestValidator.equals(
    "deletedAt unchanged",
    updated.deletedAt,
    beforeDeletedAt,
  );
  // 6) GET again and verify browsing identity matches
  const after = await api.functional.communityPlatform.communities.at(
    memberConnection,
    {
      communityId: communityA.id,
    },
  );
  typia.assert(after);
  TestValidator.equals("GET name matches updated", after.name, newName);
  TestValidator.equals(
    "GET description matches updated",
    after.description,
    newDescription,
  );
  TestValidator.equals(
    "GET iconHref matches updated",
    after.iconHref,
    newIconHref,
  );
  TestValidator.equals(
    "GET createdAt unchanged",
    after.createdAt,
    beforeCreatedAt,
  );
  TestValidator.equals(
    "GET deletedAt unchanged",
    after.deletedAt,
    beforeDeletedAt,
  );
}
