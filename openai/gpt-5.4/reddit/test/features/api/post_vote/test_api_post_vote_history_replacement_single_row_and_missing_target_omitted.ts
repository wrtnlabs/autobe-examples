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

export async function test_api_post_vote_history_replacement_single_row_and_missing_target_omitted(
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
    },
  });
  typia.assert(authorAuth);
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(voterAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);
  const replacedPost =
    await generate_random_community_platform_member_posts_create(
      authorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "text",
          textContent: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          },
        },
      },
    );
  typia.assert(replacedPost);
  const omittedPost =
    await generate_random_community_platform_member_posts_create(
      authorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "text",
          textContent: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          },
        },
      },
    );
  typia.assert(omittedPost);
  const initialDirection = "upvote";
  const finalDirection = "downvote";
  const createdVote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        params: {
          postId: replacedPost.id,
        },
        body: {
          direction: initialDirection,
        },
      },
    );
  typia.assert(createdVote);
  const replacedVote =
    await api.functional.communityPlatform.member.posts.votes.update(
      voterConnection,
      {
        postId: replacedPost.id,
        body: {
          direction: finalDirection,
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(replacedVote);
  TestValidator.equals(
    "updated vote targets the replaced post",
    replacedVote.post.id,
    replacedPost.id,
  );
  TestValidator.equals(
    "updated vote stores final direction",
    replacedVote.direction,
    finalDirection,
  );
  TestValidator.predicate(
    "updated_at reflects replacement not earlier than initial vote",
    new Date(replacedVote.updated_at).getTime() >=
      new Date(createdVote.updated_at).getTime(),
  );
  const history = await api.functional.communityPlatform.member.postVotes.index(
    voterConnection,
    {
      body: {
        direction: finalDirection,
        includeDeleted: false,
        postIds: [replacedPost.id, omittedPost.id],
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformPostVote.IRequest,
    },
  );
  typia.assert(history);
  TestValidator.equals(
    "only one matching active vote row is returned",
    history.data.length,
    1,
  );
  const result = history.data[0];
  TestValidator.equals(
    "result post matches replaced target",
    result.post.id,
    replacedPost.id,
  );
  TestValidator.equals(
    "result direction is the replacement direction",
    result.direction,
    finalDirection,
  );
  TestValidator.equals("result remains active", result.deleted_at, null);
  TestValidator.predicate(
    "omitted target post is absent from result set",
    history.data.every((vote) => vote.post.id !== omittedPost.id),
  );
  TestValidator.equals(
    "single canonical row exists for the voted post",
    history.data.filter((vote) => vote.post.id === replacedPost.id).length,
    1,
  );
}
