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

export async function test_api_community_update_name_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member auth connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Create community using utility
  const community: IRedditCommunity =
    await generate_random_reddit_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Update community name with valid value
  const validName: string = `${RandomGenerator.alphabets(3)}_${RandomGenerator.alphabets(3)}`;
  const updatedCommunity: IRedditCommunity =
    await api.functional.reddit.member.communities.update(memberConnection, {
      communityId: community.id,
      body: {
        name: validName,
      } satisfies IRedditCommunity.IUpdate,
    });
  typia.assert(updatedCommunity);
  // 4. Validate updated name
  TestValidator.equals(
    "name should be updated",
    updatedCommunity.name,
    validName,
  );
}
