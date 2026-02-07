import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaScore";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_member_upvote_post_first_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ICommunityMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create a post in a subscribed community
  const postResponse = await generate_random_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        content_type: "text" as const,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(postResponse);
  // 3. Create first upvote on the post - use the actual post response as the post property in ICommunityPostVote
  // Although ICommunityPost and ICommunityPost.ISummary are empty interfaces, in reality they contain the same structure as the API response
  // The postResponse has an id property at runtime and can be used as ICommunityPost.ISummary since it's a compatible structure
  const vote: ICommunityPostVote = {
    id: typia.random<string & tags.Format<"uuid">>(),
    vote_type: "upvote" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    post: postResponse as unknown as ICommunityPost.ISummary, // Cast to satisfy type system
  };
  const karmaScore = await api.functional.community.member.votes.updateVotes(
    memberConnection,
    {
      body: vote,
    },
  );
  typia.assert(karmaScore);
  // 4. Validate result - karma score should be 1 after first upvote
  TestValidator.equals("karma score after first upvote", karmaScore, 1);
}
