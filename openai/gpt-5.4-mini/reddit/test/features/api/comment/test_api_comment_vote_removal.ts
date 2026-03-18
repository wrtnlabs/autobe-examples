import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_comments_create } from "../../../generate/generate_random_community_platform_member_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_comment_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  const authorConnection: api.IConnection = { host: connection.host };
  const voterConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: `author_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(author);
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: `voter_${RandomGenerator.alphabets(8)}`,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(voter);
  const comment = await api.functional.communityPlatform.member.comments.create(
    authorConnection,
    {
      body: {
        community_platform_post_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  const voted =
    await api.functional.communityPlatform.member.comments.votes.index(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          action: "upvote",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformVoteComment.IRequest,
      },
    );
  typia.assert(voted);
  TestValidator.equals(
    "vote page should contain the target comment vote after upvote",
    voted.data.some(
      (vote) =>
        vote.community_platform_comment_id === comment.id &&
        vote.deleted_at === null,
    ),
    true,
  );
  const removed =
    await api.functional.communityPlatform.member.comments.votes.index(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          action: "remove",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformVoteComment.IRequest,
      },
    );
  typia.assert(removed);
  TestValidator.equals(
    "vote page should not contain an active vote after removal",
    removed.data.some(
      (vote) =>
        vote.community_platform_comment_id === comment.id &&
        vote.deleted_at === null,
    ),
    false,
  );
}
