import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_removal_denied_to_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerResponse = await authorize_moderator_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(2),
      display_name: RandomGenerator.name(),
      password: "12345678",
      bio: RandomGenerator.paragraph({ sentences: 1 }),
      avatar_url: null,
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    },
  });
  typia.assert(ownerResponse);
  const ownerLogin = await authorize_moderator_login(ownerConnection, {
    body: {
      email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(ownerResponse.email),
      password: "12345678",
    },
  });
  typia.assert(ownerLogin);
  // 2. Create first moderator
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1Response = await authorize_moderator_join(
    moderator1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(2),
        display_name: RandomGenerator.name(),
        password: "12345678",
        bio: RandomGenerator.paragraph({ sentences: 1 }),
        avatar_url: null,
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      },
    },
  );
  typia.assert(moderator1Response);
  const moderator1Login = await authorize_moderator_login(
    moderator1Connection,
    {
      body: {
        email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(moderator1Response.email),
        password: "12345678",
      },
    },
  );
  typia.assert(moderator1Login);
  // 3. Create second moderator
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2Response = await authorize_moderator_join(
    moderator2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(2),
        display_name: RandomGenerator.name(),
        password: "12345678",
        bio: RandomGenerator.paragraph({ sentences: 1 }),
        avatar_url: null,
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      },
    },
  );
  typia.assert(moderator2Response);
  const moderator2Login = await authorize_moderator_login(
    moderator2Connection,
    {
      body: {
        email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(moderator2Response.email),
        password: "12345678",
      },
    },
  );
  typia.assert(moderator2Login);
  // 4. Owner creates a community
  const communityName = `test-community-${RandomGenerator.alphaNumeric(6)}`;
  // 5. Add both moderators to the community
  // (This would typically be done through a moderator assignment endpoint)
  // 6. Moderator1 attempts to remove Moderator2 (should fail with 403 Forbidden)
  await TestValidator.error(
    "moderator should not be able to remove another moderator",
    async () => {
      await api.functional.redditLike.member.communities.moderators.remove(
        moderator1Connection,
        {
          communityName: communityName,
          username: moderator2Response.username,
        },
      );
    },
  );
}