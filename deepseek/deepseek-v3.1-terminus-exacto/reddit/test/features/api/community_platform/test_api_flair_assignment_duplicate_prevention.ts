import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_flair_assignments_create } from "../../../generate/generate_random_community_platform_moderator_communities_flair_assignments_create";
import { generate_random_community_platform_moderator_communities_flairs_create } from "../../../generate/generate_random_community_platform_moderator_communities_flairs_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_flair } from "../../../prepare/prepare_random_community_platform_community_flair";
import { prepare_random_community_platform_community_flair_assignment } from "../../../prepare/prepare_random_community_platform_community_flair_assignment";

/**
 * Test the system's prevention of duplicate flair assignments.
 * This scenario validates that the operation properly detects and rejects attempts
 * to assign the same flair to the same user within the same community when an
 * active assignment already exists.
 */
export async function test_api_flair_assignment_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // Create community using moderator connection (since moderator needs to own/manage it)
  const community =
    await generate_random_community_platform_user_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create flair in the community
  const flair =
    await generate_random_community_platform_moderator_communities_flairs_create(
      moderatorConnection,
      {
        body: {
          display_text: RandomGenerator.paragraph({ sentences: 1 }),
          background_color: "#FF0000",
          text_color: "#FFFFFF",
          css_class: "custom-flair",
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(flair);
  // First flair assignment should succeed
  const firstAssignment =
    await generate_random_community_platform_moderator_communities_flair_assignments_create(
      moderatorConnection,
      {
        body: {
          community_platform_user_id: userAuth.id,
          community_platform_community_flair_id: flair.id,
          expired_at: null,
        } satisfies ICommunityPlatformCommunityFlairAssignment.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(firstAssignment);
  // Second flair assignment should fail due to duplicate prevention
  await TestValidator.error("duplicate flair assignment", async () => {
    await generate_random_community_platform_moderator_communities_flair_assignments_create(
      moderatorConnection,
      {
        body: {
          community_platform_user_id: userAuth.id,
          community_platform_community_flair_id: flair.id,
          expired_at: null,
        } satisfies ICommunityPlatformCommunityFlairAssignment.ICreate,
        params: { communityId: community.id },
      },
    );
  });
  // Validate that the first assignment was successful
  TestValidator.equals(
    "assignment user matches",
    firstAssignment.user.id,
    userAuth.id,
  );
  TestValidator.equals(
    "assignment flair matches",
    firstAssignment.flair.id,
    flair.id,
  );
  TestValidator.equals(
    "assignment community matches",
    firstAssignment.community.id,
    community.id,
  );
}
