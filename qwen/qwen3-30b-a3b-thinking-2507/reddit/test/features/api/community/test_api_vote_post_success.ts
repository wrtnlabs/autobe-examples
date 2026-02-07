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
import { generate_random_community_platform_member_votes_create } from "../../../generate/generate_random_community_platform_member_votes_create";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";

export async function test_api_vote_post_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityPlatformMember.IJoin, // Note: DTO is empty, no required properties
  });
  // 2. Create vote
  const vote = await api.functional.communityPlatform.member.votes.create(
    memberConnection,
    {
      body: {
        vote_type: "up",
        votable_type: "post",
        votable_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(vote);
  // 3. Validate vote creation
  TestValidator.equals("vote type should be up", vote.vote_type, "up");
  TestValidator.equals(
    "vote votable type should be post",
    vote.votable_type,
    "post",
  );
  TestValidator.predicate(
    "vote should have timestamp",
    vote.created_at !== undefined,
  );
}
