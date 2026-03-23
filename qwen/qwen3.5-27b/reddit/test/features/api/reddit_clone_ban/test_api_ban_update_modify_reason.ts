import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test updating the ban reason field to provide additional context or clarification.
 * A community owner creates a community, bans another member with an initial reason,
 * then updates the ban record with a new or modified reason. Verify that the reason
 * field is updated while preserving the banned_at timestamp and keeping lifted_at
 * as null (ban remains active). The updated_at timestamp should reflect the
 * modification time.
 */
export async function test_api_ban_update_modify_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner (member1)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a community owned by member1
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Authenticate as second member (member2) who will be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(bannedMemberAuth);
  // 4. Create a ban record with initial reason
  const initialReason = "Violation of community guidelines";
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: bannedMemberAuth.id,
        reason: initialReason,
      },
    },
  );
  typia.assert(ban);
  // Verify initial ban state
  TestValidator.equals("initial reason matches", ban.reason, initialReason);
  TestValidator.predicate("banned_at is set", ban.banned_at !== null);
  TestValidator.equals("lifted_at is null", ban.lifted_at, null);
  // Store original banned_at timestamp
  const originalBannedAt = ban.banned_at;
  // 5. Update the ban record with a new reason
  const updatedReason =
    "Spam and harassment - escalated from initial violation";
  const updatedBan =
    await api.functional.redditClone.member.communities.bans.update(
      ownerConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          reason: updatedReason,
        } satisfies IRedditCloneBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 6. Verify that the reason field is updated
  TestValidator.equals(
    "reason updated to new value",
    updatedBan.reason,
    updatedReason,
  );
  // 7. Verify that banned_at timestamp is preserved
  TestValidator.equals(
    "banned_at preserved",
    updatedBan.banned_at,
    originalBannedAt,
  );
  // 8. Verify that lifted_at remains null (ban still active)
  TestValidator.equals("lifted_at remains null", updatedBan.lifted_at, null);
  // 9. Verify that updated_at is different from created_at (record was modified)
  TestValidator.notEquals(
    "updated_at differs from created_at",
    updatedBan.updated_at,
    updatedBan.created_at,
  );
  // 10. Verify that updated_at is after or equal to original ban's updated_at
  TestValidator.predicate(
    "updated_at is after original",
    new Date(updatedBan.updated_at).getTime() >=
      new Date(ban.updated_at).getTime(),
  );
}
