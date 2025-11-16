import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

export async function test_api_post_vote_delete_unauthorized_user_cannot_delete_foreign_vote(
  connection: api.IConnection,
) {
  // 1. Register member user A and keep their credentials for context
  const memberAUsername: string = RandomGenerator.name(1);
  const memberAEmail: string = typia.random<string & tags.Format<"email">>();
  const memberAPassword: string = "PasswordA!234";

  const memberAJoinRequest = {
    username: memberAUsername,
    email: memberAEmail,
    password: memberAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorizedA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinRequest,
    });
  typia.assert(authorizedA);

  // 2. Under member A, create a community
  const communityCreateBody = {
    identifier: RandomGenerator.paragraph({ sentences: 1 }),
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Under member A, create a post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 8,
    }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. Under member A, cast a vote on that post
  const postVoteCreateBody = {
    community_platform_post_id: post.id,
    vote_value: 1,
  } satisfies ICommunityPlatformPostVote.ICreate;

  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      {
        body: postVoteCreateBody,
      },
    );
  typia.assert(vote);

  const postVoteId: string & tags.Format<"uuid"> = vote.id;

  // 5. Register member user B, which switches the connection to B's context
  const memberBUsername: string = RandomGenerator.name(1);
  const memberBEmail: string = typia.random<string & tags.Format<"email">>();
  const memberBPassword: string = "PasswordB!234";

  const memberBJoinRequest = {
    username: memberBUsername,
    email: memberBEmail,
    password: memberBPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorizedB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinRequest,
    });
  typia.assert(authorizedB);

  // 6. Under member B's authentication, attempting to delete A's vote must fail
  await TestValidator.error(
    "unauthorized user cannot delete foreign vote",
    async () => {
      await api.functional.communityPlatform.memberUser.postVotes.erase(
        connection,
        {
          postVoteId,
        },
      );
    },
  );
}
