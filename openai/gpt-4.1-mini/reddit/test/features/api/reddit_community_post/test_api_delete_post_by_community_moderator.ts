import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_delete_post_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register a registered user
  const registeredUserJoinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
    ip: null,
    href: "https://www.example.com/signup",
    referrer: "https://www.example.com",
  } satisfies IRedditCommunityRegisteredUser.IJoin;
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: registeredUserJoinBody,
    });
  typia.assert(registeredUser);

  // 2. Authenticate as registered user
  const registeredUserLoginBody = {
    email: registeredUser.email,
    password: registeredUserJoinBody.password,
    ip: null,
    href: "https://www.example.com/login",
    referrer: "https://www.example.com",
  } satisfies IRedditCommunityRegisteredUser.ILogin;
  await api.functional.auth.registeredUser.login(connection, {
    body: registeredUserLoginBody,
  });

  // 3. Registered user creates a community
  const communityCreateBody = {
    communityName: `community_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. Registered user creates a post within the community
  const postTypes = ["text", "link", "image"] as const;
  const postType = RandomGenerator.pick(postTypes);
  const postCreateBody: IRedditCommunityPost.ICreate = {
    community_code: community.communityName,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    type: postType,
    content: null,
  };
  if (postType === "text") {
    postCreateBody.content = RandomGenerator.content({ paragraphs: 2 });
  } else if (postType === "link" || postType === "image") {
    postCreateBody.content = "https://www.example.com/resource";
  }
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 5. Register a community moderator
  const communityModeratorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(1),
  } satisfies IRedditCommunityCommunityModerator.ICreate;
  const communityModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModerator);

  // 6. Authenticate as community moderator
  const communityModeratorLoginBody = {
    email: communityModerator.email,
    password: communityModeratorJoinBody.password,
    ip: null,
    href: "https://www.example.com/mod/login",
    referrer: "https://www.example.com",
  } satisfies IRedditCommunityCommunityModerator.ILogin;
  await api.functional.auth.communityModerator.login(connection, {
    body: communityModeratorLoginBody,
  });

  // 7. Community moderator deletes the post
  await api.functional.redditCommunity.communityModerator.posts.erase(
    connection,
    {
      postId: post.id,
    },
  );

  // Done - We trust the backend to also have deleted all related data (comments, votes, images) due to cascade delete
}
