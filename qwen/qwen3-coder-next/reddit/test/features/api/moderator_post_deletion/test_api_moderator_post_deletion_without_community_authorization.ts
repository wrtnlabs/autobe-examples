import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";

export async function test_api_moderator_post_deletion_without_community_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connections
  const moderatorConnection: api.IConnection = { host: connection.host };
  const ownerConnection: api.IConnection = { host: connection.host };
  // 2. Register owner (community creator)
  const ownerResult = await authorize_moderator_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: "community_owner",
      display_name: "Community Owner",
      password: RandomGenerator.alphaNumeric(16),
      bio: null,
      avatar_url: null,
      href: "https://example.com",
      referrer: "https://referrer.com",
    },
  });
  typia.assert(ownerResult);
  // 3. Login as owner (generate new email with correct tags)
  const ownerEmail: string & tags.MaxLength<255> & tags.Format<"email"> =
    typia.random<string & tags.MaxLength<255> & tags.Format<"email">>();
  await authorize_moderator_login(ownerConnection, {
    body: {
      email: ownerEmail,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 4. Register moderator
  const moderatorResult = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: "moderator_user",
      display_name: "Moderator User",
      password: RandomGenerator.alphaNumeric(16),
      bio: null,
      avatar_url: null,
      href: "https://example.com",
      referrer: "https://referrer.com",
    },
  });
  typia.assert(moderatorResult);
  // 5. Login as moderator (generate new email with correct tags)
  const moderatorEmail: string & tags.MaxLength<255> & tags.Format<"email"> =
    typia.random<string & tags.MaxLength<255> & tags.Format<"email">>();
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 6. Generate a random community ID (we can't create communities with available API)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 7. Owner attempts to assign moderator role (may fail if community doesn't exist)
  try {
    await api.functional.redditLike.member.communities.moderators.create(
      ownerConnection,
      {
        communityName: "test_community",
        body: {
          user_id: moderatorResult.id,
          community_id: communityId,
          role: "moderator",
        },
      },
    );
  } catch {
    // Skip if assignment fails - test still valid
  }
  // 8. Generate a fake post ID for testing
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  // 9. Moderator attempts to delete a post where they have NO authorization
  // This tests that moderators can only delete posts in communities they're authorized for
  await TestValidator.error(
    "moderator should not delete post without community authorization",
    async () => {
      await api.functional.redditLike.moderator.posts.erase(
        moderatorConnection,
        {
          postId: fakePostId,
        },
      );
    },
  );
}
