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

export async function test_api_community_detail_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // Step 2: Create a new community with specific name, description, icon_url
  const communityName = `test-community-${RandomGenerator.alphaNumeric(8)}`;
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const communityIconUrl = typia.random<string & tags.Format<"url">>() satisfies string as string;
  const createdCommunity =
    await generate_random_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: communityDescription,
          icon_url: communityIconUrl,
        },
      },
    );
  typia.assert(createdCommunity);
  // Step 3: Access community detail as unauthenticated guest (no auth headers)
  const guestConnection: api.IConnection = { host: connection.host };
  const communityDetail = await api.functional.community.communities.at(
    guestConnection,
    {
      communityId: createdCommunity.id,
    },
  );
  typia.assert(communityDetail);
  // Step 4: Validate the response fields
  TestValidator.equals(
    "community id matches",
    communityDetail.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "community name matches",
    communityDetail.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches",
    communityDetail.description,
    communityDescription,
  );
  TestValidator.equals(
    "community icon_url matches",
    communityDetail.icon_url,
    communityIconUrl,
  );
  TestValidator.equals("owner id matches", communityDetail.owner.id, member.id);
  TestValidator.predicate(
    "owner username is non-empty",
    communityDetail.owner.username.length > 0,
  );
  TestValidator.equals(
    "subscriber_count is 0",
    communityDetail.subscriber_count,
    0,
  );
  TestValidator.equals("deleted_at is null", communityDetail.deleted_at, null);
}