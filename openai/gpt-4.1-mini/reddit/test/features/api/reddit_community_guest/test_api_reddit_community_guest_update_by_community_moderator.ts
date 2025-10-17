import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_reddit_community_guest_update_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new community moderator user to obtain authorization token
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: {
          email: moderatorEmail,
          password: "StrongPassw0rd!",
        } satisfies IRedditCommunityCommunityModerator.IJoin,
      },
    );
  typia.assert(moderator);

  // 2. Create a prerequisite community entity
  const communityName: string = RandomGenerator.name(2).replace(/\s/g, "_");
  const communityCreate: IRedditCommunityCommunity.ICreate = {
    name: communityName,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);

  // 3. Prepare update body for guest entity with valid session data
  // Use the existing guest id with random generated session info
  // Since the API requires an id, we simulate an existing guest UUID
  const guestId: string = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IRedditCommunityGuest.IUpdate = {
    session_id: `sess-${RandomGenerator.alphaNumeric(12)}`,
    ip_address: `${RandomGenerator.alphaNumeric(3)}.${RandomGenerator.alphaNumeric(3)}.${RandomGenerator.alphaNumeric(2)}.${RandomGenerator.alphaNumeric(2)}`,
    user_agent: RandomGenerator.name(3),
  };

  // 4. Perform the guest update call as community moderator
  const updatedGuest: IRedditCommunityGuest =
    await api.functional.redditCommunity.communityModerator.redditCommunityGuests.update(
      connection,
      {
        id: guestId,
        body: updateBody,
      },
    );
  typia.assert(updatedGuest);

  // 5. Validate that response's guest info reflects the updated data
  TestValidator.equals(
    "guest session_id updated correctly",
    updatedGuest.session_id,
    updateBody.session_id,
  );
  TestValidator.equals(
    "guest ip_address updated correctly",
    updatedGuest.ip_address,
    updateBody.ip_address,
  );
  TestValidator.equals(
    "guest user_agent updated correctly",
    updatedGuest.user_agent,
    updateBody.user_agent,
  );

  // 6. Validate timestamps exist and have string format
  TestValidator.predicate(
    "updated_at is non-empty string",
    typeof updatedGuest.updated_at === "string" &&
      updatedGuest.updated_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is non-empty string",
    typeof updatedGuest.created_at === "string" &&
      updatedGuest.created_at.length > 0,
  );
}
