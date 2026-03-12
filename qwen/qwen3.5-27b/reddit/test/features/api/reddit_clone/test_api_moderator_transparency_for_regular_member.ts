import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test that regular community members (non-moderators) can view moderator information for transparency.
 * A member who is subscribed to a community but not a moderator should be able to retrieve details about any moderator in that community.
 * Verify that: (1) the endpoint returns 200 OK for authenticated regular members, (2) all moderator details are visible including role, member info, and timestamps, (3) this provides transparency about who moderates the community, (4) the response format is consistent regardless of the requesting user's role.
 */
export async function test_api_moderator_transparency_for_regular_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // 2. Create a community as owner
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
  // 3. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator);
  // 4. Add moderator to the community (owner action)
  const moderatorAssignment =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: moderator.id,
          role: "mod",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Authenticate as regular member
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMember = await authorize_member_join(regularMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(regularMember);
  // 6. Regular member retrieves moderator information
  const retrievedModerator =
    await api.functional.redditClone.member.communities.moderators.at(
      regularMemberConnection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
      },
    );
  typia.assert(retrievedModerator);
  // 7. Validate moderator details are visible
  TestValidator.equals("moderator role", retrievedModerator.role, "mod");
  TestValidator.equals(
    "moderator member ID",
    retrievedModerator.member.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator username",
    retrievedModerator.member.username,
    moderator.username,
  );
  TestValidator.equals(
    "community ID",
    retrievedModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name",
    retrievedModerator.community.name,
    community.name,
  );
  // 8. Verify timestamps exist
  TestValidator.predicate(
    "created_at exists",
    retrievedModerator.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedModerator.updated_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedModerator.deleted_at === null,
  );
}
