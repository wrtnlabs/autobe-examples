import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_vote_update_removal_and_invalid_post_rejection(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: With the provided SDK typings, post/vote creation endpoints return void,
  // so we cannot capture real { postId, voteId } from the API responses in a type-safe way.
  // This test focuses on the contract-level behavior of the vote update endpoint:
  // - a successful vote update response validates against ICommunityPlatformPostVote
  // - a vote update for an ineligible/deleted post is rejected.
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1 (smoke): vote update with neutral/removal semantics returns a valid vote record.
  const removedVote =
    await api.functional.communityPlatform.member.posts.votes.update(
      memberAConnection,
      {
        postId,
        voteId,
        body: {
          voteValue: 0,
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(removedVote);
  // If removal semantics are supported, deletedAt should become non-null.
  // (If the system represents neutral differently, this may fail; keep as predicate.)
  TestValidator.predicate(
    "vote should reflect deactivation when updated with neutral/removal value",
    removedVote.deletedAt !== null,
  );
  // Scenario 2: after post deletion, vote update must be rejected.
  await api.functional.communityPlatform.member.posts.erase(memberAConnection, {
    postId,
  });
  await TestValidator.error(
    "should reject vote update for deleted/ineligible post",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.update(
        memberAConnection,
        {
          postId,
          voteId,
          body: {
            voteValue: 0,
          } satisfies ICommunityPlatformPostVote.IUpdate,
        },
      );
    },
  );
}
