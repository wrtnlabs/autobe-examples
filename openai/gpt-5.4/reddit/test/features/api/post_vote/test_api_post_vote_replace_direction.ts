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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_post_vote_replace_direction(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const post = await generate_random_community_platform_member_posts_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(voterAuth);
  const directions = ["up", "down"] as const;
  const initialDirection = RandomGenerator.pick(directions);
  const replacementDirection = initialDirection === "up" ? "down" : "up";
  const firstVote =
    await api.functional.communityPlatform.member.posts.votes.update(
      voterConnection,
      {
        postId: post.id,
        body: {
          direction: initialDirection,
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(firstVote);
  const replacedVote =
    await api.functional.communityPlatform.member.posts.votes.update(
      voterConnection,
      {
        postId: post.id,
        body: {
          direction: replacementDirection,
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(replacedVote);
  TestValidator.notEquals(
    "vote directions differ between first and replacement calls",
    firstVote.direction,
    replacedVote.direction,
  );
  TestValidator.equals(
    "first vote direction matches initial request",
    firstVote.direction,
    initialDirection,
  );
  TestValidator.equals(
    "replacement vote direction matches second request",
    replacedVote.direction,
    replacementDirection,
  );
  TestValidator.equals(
    "vote record id is reused for replacement",
    replacedVote.id,
    firstVote.id,
  );
  TestValidator.equals(
    "replacement vote remains on same post",
    replacedVote.post.id,
    post.id,
  );
  TestValidator.equals(
    "initial vote remains on target post",
    firstVote.post.id,
    post.id,
  );
  TestValidator.equals(
    "initial vote belongs to authenticated voter",
    firstVote.member.id,
    voterAuth.id,
  );
  TestValidator.equals(
    "replacement vote belongs to authenticated voter",
    replacedVote.member.id,
    voterAuth.id,
  );
  TestValidator.equals(
    "replacement vote member is same authenticated voter as initial vote",
    replacedVote.member.id,
    firstVote.member.id,
  );
  TestValidator.equals(
    "replacement vote created_at is preserved",
    replacedVote.created_at,
    firstVote.created_at,
  );
  TestValidator.equals(
    "replacement vote stays active",
    replacedVote.deleted_at,
    null,
  );
  TestValidator.equals(
    "initial vote stays active immediately after creation",
    firstVote.deleted_at,
    null,
  );
  TestValidator.predicate(
    "replacement updated_at is not earlier than first updated_at",
    new Date(replacedVote.updated_at).getTime() >=
      new Date(firstVote.updated_at).getTime(),
  );
}
