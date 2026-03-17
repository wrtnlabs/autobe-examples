import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_member_profile_view_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const joinOutput = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinOutput);
  // Step 2: Update member's profile with display name, bio
  const updatedProfile =
    await api.functional.redditCommunity.member.profile.update(connection, {
      body: {
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        avatar_image_url_id: null,
      } satisfies IRedditCommunityUserProfile.IUpdate,
    });
  typia.assert(updatedProfile);
  // Step 3: Create a post in a community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: communityId,
        post_type: "text" as const,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 4: Create a comment on the post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 5: Retrieve the member's profile using username as memberId
  const retrievedProfile = await api.functional.redditCommunity.members.at(
    connection,
    {
      memberId: updatedProfile.user.username,
    },
  );
  typia.assert(retrievedProfile);
  // Step 6: Validate response fields
  TestValidator.equals(
    "username matches",
    retrievedProfile.username,
    updatedProfile.user.username,
  );
  TestValidator.equals(
    "display name matches",
    retrievedProfile.display_name,
    updatedProfile.display_name,
  );
  TestValidator.equals("bio matches", retrievedProfile.bio, updatedProfile.bio);
  TestValidator.equals("karma score is zero", retrievedProfile.karma, 0);
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(retrievedProfile.created_at)),
  );
  TestValidator.predicate(
    "avatar_url is null when no avatar set",
    retrievedProfile.avatar_image_url === null,
  );
}
