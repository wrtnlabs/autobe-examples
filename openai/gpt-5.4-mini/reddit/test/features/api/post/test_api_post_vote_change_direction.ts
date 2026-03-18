import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_vote_create } from "../../../generate/generate_random_community_platform_member_posts_vote_create";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";

export async function test_api_post_vote_change_direction(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const postId = typia.random<string & tags.Format<"uuid">>();
  const initialDirection = 1 satisfies number;
  const changedDirection = -1 satisfies number;
  const firstVote =
    await api.functional.communityPlatform.member.posts.vote.create(
      memberConnection,
      {
        postId,
        body: {
          direction: initialDirection,
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(firstVote);
  const changedVote =
    await api.functional.communityPlatform.member.posts.vote.create(
      memberConnection,
      {
        postId,
        body: {
          direction: changedDirection,
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(changedVote);
  TestValidator.equals(
    "vote direction should change",
    changedVote.direction,
    changedDirection,
  );
  TestValidator.equals(
    "vote id should be stable for replacement",
    changedVote.id,
    firstVote.id,
  );
  TestValidator.equals(
    "vote member should remain the same",
    changedVote.communityPlatformMemberId,
    member.id,
  );
  TestValidator.equals(
    "vote should remain active",
    changedVote.deletedAt,
    null,
  );
  TestValidator.notEquals(
    "vote update should refresh timestamps",
    firstVote.updatedAt,
    changedVote.updatedAt,
  );
}
