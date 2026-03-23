import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member registers and creates a community
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member1);
  const community = await generate_random_reddit_like_member_communities_create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        icon_url: RandomGenerator.substring(
          "https://example.com/" + RandomGenerator.alphaNumeric(20),
        ) satisfies string & tags.MaxLength<80000> & tags.Format<"uri">,
      },
    },
  );
  typia.assert(community);
  // 2. Second member attempts to create a community with the same name
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member2);
  // This should fail due to duplicate community name
  await TestValidator.error("duplicate community name rejected", async () => {
    await api.functional.redditLike.member.communities.create(
      member2Connection,
      {
        body: {
          name: community.name, // Use same name as first community
          icon_url: RandomGenerator.substring(
            "https://example.com/" + RandomGenerator.alphaNumeric(20),
          ) satisfies string & tags.MaxLength<80000> & tags.Format<"uri">,
        },
      },
    );
  });
  // Also test case sensitivity
  await TestValidator.error(
    "duplicate community name (case-insensitive) rejected",
    async () => {
      await api.functional.redditLike.member.communities.create(
        member2Connection,
        {
          body: {
            name: community.name.toUpperCase(),
            icon_url: RandomGenerator.substring(
              "https://example.com/" + RandomGenerator.alphaNumeric(20),
            ) satisfies string & tags.MaxLength<80000> & tags.Format<"uri">,
          },
        },
      );
    },
  );
}
