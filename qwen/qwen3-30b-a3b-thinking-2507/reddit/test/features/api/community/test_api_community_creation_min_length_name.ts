import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_member_communities_create } from "../../../generate/generate_random_reddit_member_communities_create";
import { prepare_random_reddit_community } from "../../../prepare/prepare_random_reddit_community";

export async function test_api_community_creation_min_length_name(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
    } satisfies IRedditMember.IJoin,
  });
  // Create community with exactly 3 characters name
  const community = await generate_random_reddit_member_communities_create(
    memberConnection,
    {
      body: {
        name: "abc",
        description: typia.random<string & tags.MaxLength<500>>(),
        icon_url: typia.random<
          string & tags.MaxLength<80000> & tags.Format<"uri">
        >(),
      } satisfies IRedditCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Verify name and ID validation
  TestValidator.equals("name matches input", community.name, "abc");
  TestValidator.predicate(
    "3-character name constraint satisfied",
    community.name === "abc",
  );
  TestValidator.predicate("valid community ID", community.id !== "");
}
