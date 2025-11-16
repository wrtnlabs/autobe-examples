import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Test moderator retrieval of post vote details, verifying permission
 * boundaries.
 */
export async function test_api_post_vote_detail_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register moderator
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modPassword = "SuperStrong1$";
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      password: modPassword,
      status: "active",
      href: "https://test.app/mod-join",
      referrer: "https://test.app/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderatorAuth);

  // 2. Register normal user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserPassword_1";
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);

  // Log out moderator by switching session (simulate by logging user in)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
      href: "https://test.app/user-login",
      referrer: "https://test.app/auth",
    } satisfies ICommunityPlatformUser.ILogin,
  });

  // 3. User creates community
  const communityName = RandomGenerator.alphaNumeric(10);
  const createCommunityBody = {
    name: communityName as string & tags.MinLength<3> & tags.MaxLength<30>,
    display_title: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<100>,
    description: RandomGenerator.paragraph({ sentences: 10 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<2000>,
    visibility: "public",
    status: "active",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: createCommunityBody,
    });
  typia.assert(community);

  // 4. User creates post
  const postTitle = RandomGenerator.paragraph({ sentences: 4 });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 14,
  });
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        type: "text",
        title: postTitle,
        body: postBody,
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. User casts vote
  const voteType = "up";
  const vote = await api.functional.communityPlatform.user.postVotes.create(
    connection,
    {
      body: {
        community_platform_post_id: post.id,
        vote_type: voteType,
      } satisfies ICommunityPlatformPostVote.ICreate,
    },
  );
  typia.assert(vote);

  // 6. Switch to moderator account (login as mod)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: modPassword,
      href: "https://test.app/mod-login",
      referrer: "https://test.app/auth",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 7. Retrieve post vote details as moderator
  const detailedVote =
    await api.functional.communityPlatform.moderator.postVotes.at(connection, {
      postVoteId: vote.id,
    });
  typia.assert(detailedVote);
  TestValidator.equals("vote id matches", detailedVote.id, vote.id);
  TestValidator.equals("vote type matches", detailedVote.vote_type, voteType);
  TestValidator.equals("vote post id matches", detailedVote.post?.id, post.id);
  TestValidator.equals(
    "vote user id matches",
    detailedVote.user?.id,
    userAuth.id,
  );
  TestValidator.predicate(
    "created_at is string",
    typeof detailedVote.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof detailedVote.updated_at === "string",
  );

  // 8. Attempt to access post vote details as unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access moderator vote detail",
    async () => {
      await api.functional.communityPlatform.moderator.postVotes.at(
        unauthConn,
        {
          postVoteId: vote.id,
        },
      );
    },
  );

  // 9. Login as regular user and check forbidden access
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
      href: "https://test.app/user-login",
      referrer: "https://test.app/auth",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  await TestValidator.error(
    "user cannot access moderator vote detail",
    async () => {
      await api.functional.communityPlatform.moderator.postVotes.at(
        connection,
        {
          postVoteId: vote.id,
        },
      );
    },
  );

  // 10. Try to fetch non-existent post vote as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: modPassword,
      href: "https://test.app/mod-login",
      referrer: "https://test.app/auth",
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  await TestValidator.error(
    "moderator cannot access non-existent vote",
    async () => {
      await api.functional.communityPlatform.moderator.postVotes.at(
        connection,
        {
          postVoteId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
