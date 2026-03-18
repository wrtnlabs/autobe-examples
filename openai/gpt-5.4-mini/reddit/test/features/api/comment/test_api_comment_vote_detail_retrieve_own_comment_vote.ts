import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { ICommunityPlatformVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_comments_create } from "../../../generate/generate_random_community_platform_member_comments_create";
import { generate_random_community_platform_member_comments_vote_create } from "../../../generate/generate_random_community_platform_member_comments_vote_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";

export async function test_api_comment_vote_detail_retrieve_own_comment_vote(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: "https://example.com/avatar.png",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const comment =
    await generate_random_community_platform_member_comments_create(
      memberConnection,
      {
        body: {
          community_platform_post_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  const vote =
    await generate_random_community_platform_member_comments_vote_create(
      memberConnection,
      {
        params: { commentId: comment.id },
        body: {
          direction: 1,
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(vote);
  const found = await api.functional.communityPlatform.member.comments.votes.at(
    memberConnection,
    {
      commentId: comment.id,
      voteId: vote.id,
    },
  );
  typia.assert(found);
  TestValidator.equals(
    "vote id should match the created vote",
    found.id,
    vote.id,
  );
  TestValidator.equals(
    "comment id should match the target comment",
    found.community_platform_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "vote direction should match the stored direction",
    found.direction,
    true,
  );
}
