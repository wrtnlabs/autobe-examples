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

export async function test_api_post_vote_create_replace_same_direction(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: RandomGenerator.alphabets(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: null,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const postId = typia.random<string & tags.Format<"uuid">>();
  const body = { direction: 1 } satisfies ICommunityPlatformVote.ICreate;
  const firstVote =
    await generate_random_community_platform_member_posts_vote_create(
      memberConnection,
      {
        params: { postId },
        body,
      },
    );
  typia.assert(firstVote);
  TestValidator.equals(
    "vote direction should be upvote",
    firstVote.direction,
    1,
  );
  TestValidator.equals(
    "vote should belong to the authenticated member",
    firstVote.communityPlatformMemberId,
    member.id,
  );
  TestValidator.equals("vote should be active", firstVote.deletedAt, null);
  TestValidator.predicate(
    "vote created timestamp should exist",
    firstVote.createdAt.length > 0,
  );
  TestValidator.predicate(
    "vote updated timestamp should exist",
    firstVote.updatedAt.length > 0,
  );
  const secondVote =
    await generate_random_community_platform_member_posts_vote_create(
      memberConnection,
      {
        params: { postId },
        body,
      },
    );
  typia.assert(secondVote);
  TestValidator.equals(
    "repeated vote should preserve the same direction",
    secondVote.direction,
    1,
  );
  TestValidator.equals(
    "repeated vote should target the same member",
    secondVote.communityPlatformMemberId,
    member.id,
  );
  TestValidator.equals(
    "repeated vote should remain active",
    secondVote.deletedAt,
    null,
  );
  TestValidator.predicate(
    "repeated vote should preserve timestamps shape",
    secondVote.createdAt.length > 0 && secondVote.updatedAt.length > 0,
  );
}
