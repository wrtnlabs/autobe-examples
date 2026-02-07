import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_comments_create } from "../../../generate/generate_random_community_member_comments_create";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { generate_random_community_member_votes_create } from "../../../generate/generate_random_community_member_votes_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_post_vote } from "../../../prepare/prepare_random_community_post_vote";

export async function test_api_member_vote_flip_downvote_to_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securepassword123",
  } satisfies ICommunityMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  // 2. Create a post to attach the comment to
  const post = await generate_random_community_member_posts_create(
    memberConnection,
    {
      body: {} satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment = await generate_random_community_member_comments_create(
    memberConnection,
    {
      body: {} satisfies ICommunityComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Cast an initial downvote on the comment
  const downvote = await generate_random_community_member_votes_create(
    memberConnection,
    {
      body: {
        target_id: comment.id,
        vote_type: "downvote",
      } satisfies ICommunityPostVote.ICreate,
    },
  );
  typia.assert(downvote);
  TestValidator.equals(
    "initial vote type is downvote",
    downvote.vote_type,
    "downvote",
  );
  // 5. Flip the vote from downvote to upvote
  const updatedVote = await api.functional.community.member.votes.update(
    memberConnection,
    {
      voteId: downvote.id,
      body: { vote_type: "upvote" } satisfies ICommunityPostVote.IUpdate,
    },
  );
  typia.assert(updatedVote);
  // 6. Validate the vote flip
  TestValidator.equals(
    "updated vote type is upvote",
    updatedVote.vote_type,
    "upvote",
  );
  TestValidator.notEquals(
    "updated_at changed after flip",
    downvote.updated_at,
    updatedVote.updated_at,
  );
  // Validate that the vote's post is populated (as per DTO, we can't validate specific properties)
  TestValidator.predicate("post is present", updatedVote.post !== undefined);
}
