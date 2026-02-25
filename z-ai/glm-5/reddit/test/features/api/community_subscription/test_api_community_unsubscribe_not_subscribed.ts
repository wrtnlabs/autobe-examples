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

export async function test_api_community_unsubscribe_not_subscribed(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member (community creator)
  const creatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(creatorConnection, {});
  // Step 2: Create a test community
  const community = await generate_random_community_member_communities_create(
    creatorConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Create second member who has NOT subscribed
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {});
  // Step 4: Second member attempts to unsubscribe (should fail)
  // Business rule: Unsubscription requires existing subscription
  // Expected: HTTP 400 Bad Request with message "You are not subscribed to this community"
  await TestValidator.error(
    "should fail when member attempts to unsubscribe without being subscribed",
    async () => {
      await api.functional.community.member.communities.subscriptions.erase(
        secondMemberConnection,
        {
          communityName: community.name,
        },
      );
    },
  );
}
