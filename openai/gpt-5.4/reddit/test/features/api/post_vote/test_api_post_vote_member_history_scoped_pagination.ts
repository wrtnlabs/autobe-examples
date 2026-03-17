import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_member_history_scoped_pagination(
  connection: api.IConnection,
): Promise<void> {
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorAuth);
  const communityBody = {
    slug: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  const targetPostBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    community_platform_community_id: community.id,
    post_type: "text",
    textContent: {
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies ICommunityPlatformPostText.ICreate,
  } satisfies ICommunityPlatformPost.ICreate;
  const targetPost =
    await generate_random_community_platform_member_posts_create(
      authorConnection,
      {
        body: targetPostBody,
      },
    );
  typia.assert(targetPost);
  const foreignPostBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    community_platform_community_id: community.id,
    post_type: "text",
    textContent: {
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies ICommunityPlatformPostText.ICreate,
  } satisfies ICommunityPlatformPost.ICreate;
  const foreignPost =
    await generate_random_community_platform_member_posts_create(
      authorConnection,
      {
        body: foreignPostBody,
      },
    );
  typia.assert(foreignPost);
  const browsingMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(browsingMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const expectedDirection = "upvote";
  const browsingVoteBody = {
    direction: expectedDirection,
  } satisfies ICommunityPlatformPostVote.ICreate;
  const browsingVote =
    await generate_random_community_platform_member_posts_votes_create(
      browsingMemberConnection,
      {
        params: {
          postId: targetPost.id,
        },
        body: browsingVoteBody,
      },
    );
  typia.assert(browsingVote);
  const foreignMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(foreignMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const foreignVote =
    await generate_random_community_platform_member_posts_votes_create(
      foreignMemberConnection,
      {
        params: {
          postId: foreignPost.id,
        },
        body: {
          direction: "downvote",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(foreignVote);
  const unrelatedPostId = typia.random<string & tags.Format<"uuid">>();
  const requestBody = {
    page: 1,
    limit: 10,
    postIds: [targetPost.id, foreignPost.id, unrelatedPostId],
  } satisfies ICommunityPlatformPostVote.IRequest;
  const response =
    await api.functional.communityPlatform.member.postVotes.index(
      browsingMemberConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page matches request",
    response.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "pagination record count covers current data length",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  TestValidator.predicate(
    "pagination pages are coherent for non-empty result sets",
    response.pagination.records === 0 ||
      response.pagination.pages >= response.pagination.current,
  );
  TestValidator.predicate(
    "response includes the browsing member vote",
    response.data.some((vote) => vote.id === browsingVote.id),
  );
  TestValidator.predicate(
    "foreign member vote is not exposed by vote id",
    response.data.every((vote) => vote.id !== foreignVote.id),
  );
  TestValidator.predicate(
    "all returned votes are scoped to the target post only",
    response.data.every((vote) => vote.post.id === targetPost.id),
  );
  TestValidator.predicate(
    "foreign voted post is not exposed",
    response.data.every((vote) => vote.post.id !== foreignPost.id),
  );
  TestValidator.predicate(
    "unrelated post id filter does not fabricate results",
    response.data.every((vote) => vote.post.id !== unrelatedPostId),
  );
  TestValidator.predicate(
    "all returned directions match the browsing member active vote",
    response.data.every((vote) => vote.direction === expectedDirection),
  );
  TestValidator.predicate(
    "joined post summary references the target post title",
    response.data.every((vote) => vote.post.title === targetPost.title),
  );
  TestValidator.predicate(
    "joined post summary references the target community id",
    response.data.every((vote) => vote.post.community.id === community.id),
  );
  TestValidator.predicate(
    "joined post summary references the target community title",
    response.data.every(
      (vote) => vote.post.community.title === community.title,
    ),
  );
  TestValidator.predicate(
    "joined post summary references the author member",
    response.data.every((vote) => vote.post.author.id === authorAuth.id),
  );
  TestValidator.predicate(
    "member-post pairs appear at most once",
    new Set(response.data.map((vote) => vote.post.id)).size ===
      response.data.length,
  );
}
