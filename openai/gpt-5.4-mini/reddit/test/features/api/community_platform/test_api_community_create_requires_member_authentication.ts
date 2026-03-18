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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_create_requires_member_authentication(
  connection: api.IConnection,
): Promise<void> {
  const body = {
    name: `community_${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    iconImageUrl: "https://example.com/icon.png",
  } satisfies ICommunityPlatformCommunity.ICreate;
  await TestValidator.httpError(
    "community creation requires authentication",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body,
        },
      );
    },
  );
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      username: `user_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const created =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      { body },
    );
  typia.assert(created);
  TestValidator.equals(
    "community name should match request",
    created.name,
    body.name,
  );
  TestValidator.equals(
    "community description should match request",
    created.description,
    body.description,
  );
  TestValidator.equals(
    "community icon URL should match request",
    created.iconImageUrl,
    body.iconImageUrl,
  );
  TestValidator.equals(
    "community deletedAt should be null",
    created.deletedAt,
    null,
  );
  TestValidator.predicate(
    "community status should be populated",
    created.status.length > 0,
  );
  TestValidator.predicate(
    "community owner should be assigned by the server",
    created.owner !== null && created.owner !== undefined,
  );
}
