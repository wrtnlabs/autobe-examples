import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_community_update_by_user(
  connection: api.IConnection,
) {
  // 1. User registration
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "abcedf123",
    href: "https://example.com/home",
    referrer: "https://google.com",
    ip: null,
  } satisfies IRedditCommunityUser.ICreate;

  const userAuthorized: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreateBody });
  typia.assert(userAuthorized);

  // 2. User login
  const userLoginBody = {
    email: userCreateBody.email,
    password: userCreateBody.password,
    href: userCreateBody.href,
    referrer: userCreateBody.referrer,
    ip: null,
  } satisfies IRedditCommunityUser.ILogin;

  const userLoginAuthorized: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: userLoginBody });
  typia.assert(userLoginAuthorized);

  // 3. Create community
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const communityCreated: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(communityCreated);

  // 4. Update community
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });
  const updateBody = {
    description: updatedDescription,
    updated_at: new Date().toISOString(),
  } satisfies IRedditCommunityCommunity.IUpdate;

  const communityUpdated: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.update(connection, {
      communityName: communityCreateBody.name,
      body: updateBody,
    });
  typia.assert(communityUpdated);

  // 5. Business logic validation
  TestValidator.equals(
    "Community name remains unchanged after update",
    communityUpdated.name,
    communityCreated.name,
  );
  TestValidator.notEquals(
    "Community description updated",
    communityUpdated.description,
    communityCreated.description,
  );
  TestValidator.notEquals(
    "Community updated_at changed",
    communityUpdated.updated_at,
    communityCreated.updated_at,
  );
}
