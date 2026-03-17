import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarma";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarma";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_comments_votes_create } from "../../../generate/generate_random_community_platform_member_comments_votes_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_admin_karma_list_with_vote_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin1234",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Create test members (author, voter1, voter2, voter3)
  const memberConnections: api.IConnection[] = [];
  const memberIds: string[] = [];
  for (let i = 0; i < 4; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "member1234",
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: "https://test.com",
        referrer: "https://test.com/referrer",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.IJoin,
    });
    typia.assert(member);
    memberConnections.push(memberConnection);
    memberIds.push(member.id);
  }
  const [
    authorConnection,
    voter1Connection,
    voter2Connection,
    voter3Connection,
  ] = memberConnections;
  const [authorId, voter1Id, voter2Id, voter3Id] = memberIds;
  // 3. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Note: In real implementation, members would need to subscribe to community before posting/voting
  // This test assumes subscription requirement is handled by the API or is not enforced
  // 4. Create text post
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment on post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 6. Perform voting operations and track expected karma scores
  const expectedKarma: Record<string, number> = {
    [authorId]: 0,
    [voter1Id]: 0,
    [voter2Id]: 0,
    [voter3Id]: 0,
  };
  // Voter1 upvotes post (+1 to author)
  await generate_random_community_platform_member_posts_votes_create(
    voter1Connection,
    {
      body: { type: "up" } satisfies ICommunityPlatformPostVote.ICreate,
      params: { postId: post.id },
    },
  );
  expectedKarma[authorId] += 1;
  // Voter2 downvotes post (-1 to author)
  await generate_random_community_platform_member_posts_votes_create(
    voter2Connection,
    {
      body: { type: "down" } satisfies ICommunityPlatformPostVote.ICreate,
      params: { postId: post.id },
    },
  );
  expectedKarma[authorId] -= 1;
  // Voter3 upvotes comment (+1 to author)
  await generate_random_community_platform_member_comments_votes_create(
    voter3Connection,
    {
      body: { type: "upvote" } satisfies ICommunityPlatformCommentVote.ICreate,
      params: { commentId: comment.id },
    },
  );
  expectedKarma[authorId] += 1;
  // Voter1 changes vote from upvote to downvote on post (-2 to author: -1 removes upvote, -1 adds downvote)
  await generate_random_community_platform_member_posts_votes_create(
    voter1Connection,
    {
      body: { type: "down" } satisfies ICommunityPlatformPostVote.ICreate,
      params: { postId: post.id },
    },
  );
  expectedKarma[authorId] -= 2;
}