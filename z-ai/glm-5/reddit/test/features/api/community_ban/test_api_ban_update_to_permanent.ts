import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
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
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_ban_update_to_permanent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member who will become community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
      href: "https://example.com/register",
    },
  });
  typia.assert(owner);
  // 2. Create a community (owner becomes moderator with full privileges)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {
      body: {
        name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(community);
  // 3. Create another member who will be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
      href: "https://example.com/register",
    },
  });
  typia.assert(bannedMember);
  // 4. Create a temporary ban with a future expiration date
  const futureExpirationDate = new Date();
  futureExpirationDate.setDate(futureExpirationDate.getDate() + 30);
  const temporaryBan =
    await generate_random_community_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          username: bannedMember.username,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expired_at: futureExpirationDate.toISOString(),
        },
      },
    );
  typia.assert(temporaryBan);
  // Verify initial ban has an expiration date (temporary)
  TestValidator.predicate(
    "initial ban should have expiration date (temporary)",
    temporaryBan.expiredAt !== null,
  );
  // 5. Update the ban to permanent by setting expiredAt to null
  const updatedBan =
    await api.functional.community.member.communities.bans.update(
      ownerConnection,
      {
        communityName: community.name,
        banId: temporaryBan.id,
        body: {
          expiredAt: null,
        } satisfies ICommunityBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 6. Validate the response
  TestValidator.equals(
    "ban id should be preserved",
    updatedBan.id,
    temporaryBan.id,
  );
  TestValidator.equals(
    "community should be preserved",
    updatedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "member should be preserved",
    updatedBan.member.id,
    bannedMember.id,
  );
  TestValidator.equals(
    "bannedBy should be preserved",
    updatedBan.bannedBy.id,
    owner.id,
  );
  TestValidator.equals(
    "reason should be preserved",
    updatedBan.reason,
    temporaryBan.reason,
  );
  TestValidator.equals(
    "expiredAt should now be null (permanent)",
    updatedBan.expiredAt,
    null,
  );
}
