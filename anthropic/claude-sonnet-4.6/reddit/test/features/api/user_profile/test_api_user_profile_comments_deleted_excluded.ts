import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import type { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import type { IPageICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

export async function test_api_user_profile_comments_deleted_excluded(
  connection: api.IConnection,
): Promise<void> {
  // ─── Step 1: Register first member (author) ───────────────────────────────
  const authorConnection: api.IConnection = { host: connection.host };
  const authorMember = await authorize_member_join(authorConnection, {});
  typia.assert(authorMember);
  // ─── Step 2: Create a community as the author ─────────────────────────────
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // ─── Step 3: Subscribe the author to the community ───────────────────────
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      authorConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // ─── Step 4: Create a post in the community ───────────────────────────────
  const post = await api.functional.community.member.communities.posts.create(
    authorConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // ─── Step 5: Create three comments ───────────────────────────────────────
  // Comment A: to remain
  const commentA = await generate_random_community_member_posts_comments_create(
    authorConnection,
    { params: { postId: post.id } },
  );
  typia.assert(commentA);
  // Comment B: to be deleted by author
  const commentB = await generate_random_community_member_posts_comments_create(
    authorConnection,
    { params: { postId: post.id } },
  );
  typia.assert(commentB);
  // Comment C: to be deleted by moderator
  const commentC = await generate_random_community_member_posts_comments_create(
    authorConnection,
    { params: { postId: post.id } },
  );
  typia.assert(commentC);
  // ─── Step 6: Register second member (moderator) ──────────────────────────
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorMember);
  // ─── Step 7: Assign second member as moderator ───────────────────────────
  const moderatorRole =
    await generate_random_community_member_communities_moderators_create(
      authorConnection,
      {
        params: { communityId: community.id },
        body: { member_id: moderatorMember.id },
      },
    );
  typia.assert(moderatorRole);
  // ─── Step 8: Author deletes comment B ────────────────────────────────────
  await api.functional.community.member.posts.comments.erase(authorConnection, {
    postId: post.id,
    commentId: commentB.id,
  });
  // ─── Step 9: Moderator deletes comment C ─────────────────────────────────
  await api.functional.community.member.posts.comments.erase(
    moderatorConnection,
    {
      postId: post.id,
      commentId: commentC.id,
    },
  );
  // ─── Step 10: Retrieve author's userProfileId ─────────────────────────────
  const profilesPage = await api.functional.community.userProfiles.index(
    authorConnection,
    {
      body: {
        search: authorMember.username,
      } satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(profilesPage);
  const authorProfile = profilesPage.data.find(
    (p) => p.community_member_id === authorMember.id,
  );
  if (authorProfile === undefined)
    throw new Error("Author profile not found in user profiles listing");
  const userProfileId = authorProfile.id;
  // ─── Test Execution: Retrieve author's comment history ────────────────────
  const commentsPage =
    await api.functional.community.userProfiles.comments.index(
      authorConnection,
      {
        userProfileId,
        body: {} satisfies ICommunityComment.IRequest,
      },
    );
  typia.assert(commentsPage);
  // ─── Validation ───────────────────────────────────────────────────────────
  // Only comment A should remain
  TestValidator.equals(
    "only one comment remains after two deletions",
    commentsPage.pagination.records,
    1,
  );
  const commentIds = commentsPage.data.map((c) => c.id);
  // Comment A must be present
  TestValidator.predicate("retained comment A is in results", () =>
    commentIds.includes(commentA.id),
  );
  // Comment B (author-deleted) must NOT be present
  TestValidator.predicate(
    "author-deleted comment B is excluded",
    () => !commentIds.includes(commentB.id),
  );
  // Comment C (moderator-deleted) must NOT be present
  TestValidator.predicate(
    "moderator-deleted comment C is excluded",
    () => !commentIds.includes(commentC.id),
  );
}
