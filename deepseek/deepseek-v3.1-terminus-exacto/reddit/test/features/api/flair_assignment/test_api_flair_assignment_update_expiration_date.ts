import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_flair } from "../../../prepare/prepare_random_community_platform_community_flair";
import { prepare_random_community_platform_community_flair_assignment } from "../../../prepare/prepare_random_community_platform_community_flair_assignment";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_flair_assignment_update_expiration_date(
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
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create flair definition
  const flair =
    await generate_random_community_platform_moderator_communities_flairs_create(
      moderatorConnection,
      {
        body: {
          display_text: RandomGenerator.paragraph({ sentences: 1 }),
          background_color: "#FF0000",
          text_color: "#FFFFFF",
          css_class: "premium-flair",
          is_active: true,
        } satisfies ICommunityPlatformCommunityFlair.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(flair);
  // Create flair assignment with null expiration (permanent)
  const initialAssignment =
    await generate_random_community_platform_moderator_communities_flair_assignments_create(
      moderatorConnection,
      {
        body: {
          community_platform_user_id: userAuth.id,
          community_platform_community_flair_id: flair.id,
          expired_at: null,
        } satisfies ICommunityPlatformCommunityFlairAssignment.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(initialAssignment);
  // Verify initial assignment has null expiration
  TestValidator.equals(
    "initial assignment has null expiration",
    initialAssignment.expired_at,
    null,
  );
  // Update assignment with future expiration date
  const futureExpiration = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedAssignment =
    await api.functional.communityPlatform.moderator.communities.flair_assignments.update(
      moderatorConnection,
      {
        communityId: community.id,
        assignmentId: initialAssignment.id,
        body: {
          expired_at: futureExpiration,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // Verify updated assignment has new expiration date
  TestValidator.equals(
    "updated assignment has future expiration",
    updatedAssignment.expired_at,
    futureExpiration,
  );
  // Verify all other properties remain unchanged
  TestValidator.equals(
    "assignment ID unchanged",
    updatedAssignment.id,
    initialAssignment.id,
  );
  TestValidator.equals(
    "user unchanged",
    updatedAssignment.user.id,
    initialAssignment.user.id,
  );
  TestValidator.equals(
    "community unchanged",
    updatedAssignment.community.id,
    initialAssignment.community.id,
  );
  TestValidator.equals(
    "flair unchanged",
    updatedAssignment.flair.id,
    initialAssignment.flair.id,
  );
  TestValidator.equals(
    "assignedBy unchanged",
    updatedAssignment.assignedBy.id,
    initialAssignment.assignedBy.id,
  );
}
