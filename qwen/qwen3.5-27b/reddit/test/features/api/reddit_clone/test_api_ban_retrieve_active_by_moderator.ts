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
 * Test that a community moderator can successfully retrieve details of an active ban record.
 *
 * This test verifies:
 * 1. A moderator authenticates to the system
 * 2. A community exists with the moderator having appropriate role (owner)
 * 3. A ban record exists for a specific member in that community with an optional reason
 * 4. The moderator can retrieve the ban details including the banned member's information,
 *    ban reason, banned_at timestamp, and all other ban metadata
 * 5. The response includes the complete IRedditCloneBan object with community summary,
 *    member summary, reason (if provided), banned_at, lifted_at (null for active ban),
 *    and all audit timestamps
 */
export async function test_api_ban_retrieve_active_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth: IRedditCloneMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(2),
        bio: null,
        avatar_uri: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(moderatorAuth);
  // 2. Target member authentication (the one who will be banned)
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMemberAuth: IRedditCloneMember.IAuthorized =
    await authorize_member_join(targetMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(2),
        bio: null,
        avatar_uri: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(targetMemberAuth);
  // 3. Create community (moderator becomes owner)
  const community: IRedditCloneCommunity =
    await generate_random_reddit_clone_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        },
      },
    );
  typia.assert(community);
  // 4. Create ban record for target member in the community
  const ban: IRedditCloneBan =
    await generate_random_reddit_clone_member_communities_bans_create(
      moderatorConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: targetMemberAuth.id,
          reason: "Violation of community guidelines",
        },
      },
    );
  typia.assert(ban);
  // 5. Retrieve ban details using the ban ID and community ID
  const retrievedBan: IRedditCloneBan =
    await api.functional.redditClone.communities.bans.at(moderatorConnection, {
      communityId: community.id,
      banId: ban.id,
    });
  typia.assert(retrievedBan);
  // 6. Validate the retrieved ban contains all expected fields
  TestValidator.equals("ban ID matches", retrievedBan.id, ban.id);
  TestValidator.equals(
    "community ID matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned member ID matches",
    retrievedBan.member.id,
    targetMemberAuth.id,
  );
  TestValidator.equals(
    "banned member username matches",
    retrievedBan.member.username,
    targetMemberAuth.username,
  );
  TestValidator.equals(
    "ban reason matches",
    retrievedBan.reason,
    "Violation of community guidelines",
  );
  TestValidator.equals(
    "lifted_at is null (active ban)",
    retrievedBan.lifted_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null (not soft-deleted)",
    retrievedBan.deleted_at,
    null,
  );
  TestValidator.predicate("banned_at timestamp is valid", () => {
    const date = new Date(retrievedBan.banned_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("created_at timestamp is valid", () => {
    const date = new Date(retrievedBan.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at timestamp is valid", () => {
    const date = new Date(retrievedBan.updated_at);
    return !isNaN(date.getTime());
  });
}
