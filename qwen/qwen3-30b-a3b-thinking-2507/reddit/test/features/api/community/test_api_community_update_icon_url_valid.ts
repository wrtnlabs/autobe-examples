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

export async function test_api_community_update_icon_url_valid(
  connection: api.IConnection,
) {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Create community with valid icon URL ending in .png
  const community = await api.functional.reddit.member.communities.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_url: `https://cloud-storage.example.com/${RandomGenerator.alphaNumeric(8)}.png`,
      } satisfies IRedditCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Update community icon URL with valid cloud-stored URL ending in .png
  const newIconUrl = `https://cloud-storage.example.com/${RandomGenerator.alphaNumeric(8)}.png`;
  const updatedCommunity =
    await api.functional.reddit.member.communities.update(memberConnection, {
      communityId: community.id,
      body: {
        icon_url: newIconUrl,
      } satisfies IRedditCommunity.IUpdate,
    });
  typia.assert(updatedCommunity);
  // 4. Validate the URL format matches system requirements
  TestValidator.equals(
    "icon URL matches input",
    updatedCommunity.icon_url,
    newIconUrl,
  );
  TestValidator.predicate("URL format valid", newIconUrl.endsWith(".png"));
}
