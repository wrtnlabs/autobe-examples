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

export async function test_api_post_vote_history_filters_active_and_removed_records(
  connection: api.IConnection,
): Promise<void> {
  const authorConnection: api.IConnection = { host: connection.host };
  const authorJoin = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorJoin);
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const firstPost =
    await generate_random_community_platform_member_posts_create(
      authorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "text",
          textContent: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(firstPost);
  const secondPost =
    await generate_random_community_platform_member_posts_create(
      authorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "text",
          textContent: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(secondPost);
  const voterConnection: api.IConnection = { host: connection.host };
  const voterJoin = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(voterJoin);
  const activeVote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        params: {
          postId: firstPost.id,
        },
      },
    );
  typia.assert(activeVote);
  const chosenDirection = activeVote.direction;
  const removedVote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        params: {
          postId: secondPost.id,
        },
        body: {
          direction: chosenDirection,
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(removedVote);
  await api.functional.communityPlatform.member.posts.votes.erase(
    voterConnection,
    {
      postId: secondPost.id,
    },
  );
  const activeOnly =
    await api.functional.communityPlatform.member.postVotes.index(
      voterConnection,
      {
        body: {
          direction: chosenDirection,
          postIds: [firstPost.id, secondPost.id],
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(activeOnly);
  TestValidator.equals("active-only result count", activeOnly.data.length, 1);
  TestValidator.equals(
    "active-only post id matches active post",
    activeOnly.data[0]?.post.id,
    firstPost.id,
  );
  TestValidator.equals(
    "active-only direction matches requested direction",
    activeOnly.data[0]?.direction,
    chosenDirection,
  );
  TestValidator.equals(
    "active-only deleted_at is null",
    activeOnly.data[0]?.deleted_at,
    null,
  );
  TestValidator.predicate(
    "removed post absent from active-only query",
    !ArrayUtil.has(
      activeOnly.data,
      (record) => record.post.id === secondPost.id,
    ),
  );
  const includingDeleted =
    await api.functional.communityPlatform.member.postVotes.index(
      voterConnection,
      {
        body: {
          direction: chosenDirection,
          includeDeleted: true,
          postIds: [firstPost.id, secondPost.id],
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformPostVote.IRequest,
      },
    );
  typia.assert(includingDeleted);
  TestValidator.equals(
    "including-deleted result count",
    includingDeleted.data.length,
    2,
  );
  const firstRecord = includingDeleted.data.find(
    (record) => record.post.id === firstPost.id,
  );
  const secondRecord = includingDeleted.data.find(
    (record) => record.post.id === secondPost.id,
  );
  TestValidator.predicate(
    "active post record exists in includeDeleted query",
    firstRecord !== undefined,
  );
  TestValidator.predicate(
    "removed post record exists in includeDeleted query",
    secondRecord !== undefined,
  );
  TestValidator.equals(
    "active record direction preserved",
    firstRecord?.direction,
    chosenDirection,
  );
  TestValidator.equals(
    "removed record direction preserved",
    secondRecord?.direction,
    chosenDirection,
  );
  TestValidator.equals(
    "active record deleted_at remains null",
    firstRecord?.deleted_at,
    null,
  );
  TestValidator.predicate(
    "removed record deleted_at is populated",
    secondRecord?.deleted_at !== null && secondRecord?.deleted_at !== undefined,
  );
  const returnedPostIds = includingDeleted.data.map((record) => record.post.id);
  const uniquePostIds = new Set(returnedPostIds);
  TestValidator.equals(
    "canonical vote rows are unique per post",
    uniquePostIds.size,
    2,
  );
  TestValidator.predicate(
    "first post appears at most once",
    returnedPostIds.filter((id) => id === firstPost.id).length === 1,
  );
  TestValidator.predicate(
    "second post appears at most once",
    returnedPostIds.filter((id) => id === secondPost.id).length === 1,
  );
}
