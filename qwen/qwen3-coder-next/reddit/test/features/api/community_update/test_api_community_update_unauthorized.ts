import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
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

export async function test_api_community_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create owner connection
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: "password123",
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  await authorize_member_join(ownerConnection, {
    body: ownerData,
  });
  // Create attacker connection
  const attackerConnection: api.IConnection = { host: connection.host };
  const attackerData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: "password123",
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  await authorize_member_join(attackerConnection, {
    body: attackerData,
  });
  // Use a predetermined community name for testing
  const communityName = "testcommunity123";
  // Attacker attempts to update a community (should be unauthorized)
  // Even without successful community creation, this validates the update security
  const updateData = {
    description: "Hacked description",
    icon_url: null,
  } satisfies IRedditLikeCommunity.IUpdate;
  await TestValidator.error(
    "should reject unauthorized community update",
    async () => {
      await api.functional.redditLike.member.communities.update(
        attackerConnection,
        {
          communityName: communityName,
          body: updateData,
        },
      );
    },
  );
}
