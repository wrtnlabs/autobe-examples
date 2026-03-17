import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_community_creation_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get auth tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Prepare community creation body with specific values
  const communityName = `TestCommunity_${RandomGenerator.alphaNumeric(8)}`;
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  // Generate as Format<"uri"> to match the response type; cast to Format<"url"> for the body input
  const communityIconUrl = typia.random<string & tags.Format<"uri">>();
  // Step 3: Create community using the generation utility
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: communityName,
        description: communityDescription,
        icon_url: communityIconUrl satisfies string as string &
          tags.Format<"url">,
      },
    },
  );
  typia.assert(community);
  // Step 4: Validate returned community details
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches input",
    community.description,
    communityDescription,
  );
  TestValidator.equals(
    "community icon_url matches input",
    community.icon_url,
    communityIconUrl,
  );
  TestValidator.equals(
    "owner id matches authenticated member",
    community.owner.id,
    authorized.id,
  );
  TestValidator.equals(
    "owner username matches authenticated member",
    community.owner.username,
    authorized.username,
  );
  TestValidator.equals(
    "subscriber_count is 0 at creation",
    community.subscriber_count,
    0,
  );
  TestValidator.equals(
    "deleted_at is null for active community",
    community.deleted_at,
    null,
  );
}
