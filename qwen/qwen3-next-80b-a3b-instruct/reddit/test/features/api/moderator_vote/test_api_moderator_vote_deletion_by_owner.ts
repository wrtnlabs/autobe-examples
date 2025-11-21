import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import type { ICommunityBBSCitizenICreate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenICreate";
import type { ICommunityBBSCitizenILogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenILogin";
import type { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";
import type { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";
import type { ICommunityBBSPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPostVote";

export async function test_api_moderator_vote_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Generate moderator email and join
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityBBSModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail,
    });
  typia.assert(moderator);

  // Step 2: Generate citizen email and join
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizen: ICommunityBBSCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: citizenEmail,
    });
  typia.assert(citizen);

  // Step 3: Create a post
  const post: ICommunityBBSPost =
    await api.functional.communityBBS.citizen.posts.create(connection, {
      body: RandomGenerator.paragraph(),
    });
  typia.assert(post);

  // Step 4: Citizen votes on the post
  const vote: ICommunityBBSPostVote =
    await api.functional.communityBBS.citizen.posts.votes.create(connection, {
      postId: post.id,
      body: {
        type: "upvote" as const,
      },
    });
  typia.assert(vote);

  // Step 5: Moderator authenticates with exact email and strong password
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorSecure123!",
    } satisfies ICommunityBBSModerator.ILogin,
  });

  // Step 6: Moderator deletes the vote
  await api.functional.communityBBS.moderator.posts.votes.erase(connection, {
    postId: post.id,
  });
}
