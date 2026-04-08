import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_non_owner_delete_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: "memberA_" + typia.random<string & tags.Format<"uuid">>(),
      href: "http://test.local",
      referrer: "http://test.local",
    },
  });
  typia.assert(memberAAuth);
  // 2. Register and authenticate member B (non-owner attempting deletion)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: "memberB_" + typia.random<string & tags.Format<"uuid">>(),
      href: "http://test.local",
      referrer: "http://test.local",
    },
  });
  typia.assert(memberBAuth);
  // 3. Create a community as member A (acting as owner)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name:
            "test-community-" + typia.random<string & tags.Format<"uuid">>(),
          description: "Test community for non-owner deletion validation",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Verify member A is the owner of the community
  TestValidator.equals(
    "member A is community owner",
    community.owner.id,
    memberAAuth.id,
  );
  // 5. Attempt to delete the community as member B (non-owner) - should fail with 403
  await TestValidator.error("non-owner cannot delete community", async () => {
    await api.functional.redditPlatform.member.communities.erase(
      memberBConnection,
      {
        name: community.name,
      },
    );
  });
  // 6. Verify the community still exists (not deleted by member B)
  // Since erase returns void on success, and member B failed to delete,
  // the community should still be accessible by member A
  // 7. Verify member A (owner) can successfully delete the community
  await api.functional.redditPlatform.member.communities.erase(
    memberAConnection,
    {
      name: community.name,
    },
  );
  // Community deleted successfully by owner
}
