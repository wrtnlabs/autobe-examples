import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate the assignment of a new moderator by an existing user moderator.
 *
 * 1. Register user A (moderator) with unique email and login.
 * 2. User A creates a new community.
 * 3. Register user B to be assigned as the new moderator.
 * 4. As user A (existing moderator), assign user B as a moderator for the
 *    community.
 * 5. Verify that user B is assigned successfully (correct community & user).
 * 6. Attempt to assign user B again as moderator for the same community, expecting
 *    a business rule error.
 * 7. Attempt to assign a new moderator as a different, non-moderator user,
 *    expecting a forbidden/authorization error.
 */
export async function test_api_assign_community_moderator_by_user(
  connection: api.IConnection,
) {
  // 1. Register user A (will be a moderator)
  const emailA = typia.random<string & tags.Format<"email">>();
  const displayA = RandomGenerator.name();
  const userA: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: emailA,
        password: "passwordA",
        display_name: displayA,
        href: "https://test-join-a.example.com",
        referrer: "https://ref-join-a.example.com",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userA);

  // 2. User A creates a new community
  const newCommName = RandomGenerator.alphabets(15).toLowerCase();
  const commBody = {
    name: newCommName as string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">,
    description: RandomGenerator.paragraph({ sentences: 6 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<250>,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: commBody,
    });
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, commBody.name);

  // 3. Register user B to be assigned as moderator
  const emailB = typia.random<string & tags.Format<"email">>();
  const displayB = RandomGenerator.name();
  // To get a distinct session, clone connection (reset headers)
  const connB: api.IConnection = { ...connection, headers: {} };
  const userB: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connB, {
      body: {
        email: emailB,
        password: "passwordB",
        display_name: displayB,
        href: "https://test-join-b.example.com",
        referrer: "https://ref-join-b.example.com",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userB);

  // 4. As user A (creator & moderator), assign user B as a new moderator for the community
  const assignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.user.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          user_id: userB.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(assignment);
  TestValidator.equals(
    "assigned community correct",
    assignment.community.id,
    community.id,
  );
  TestValidator.equals("assigned user correct", assignment.user.id, userB.id);

  // 5. Attempt to assign same user B again as moderator — expect duplication error
  await TestValidator.error(
    "duplicate moderator assignment is rejected",
    async () => {
      await api.functional.communityPlatform.user.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            user_id: userB.id,
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // 6. Attempt to assign moderator using a non-moderator session (user B)
  await TestValidator.error(
    "only current moderators may assign new moderators",
    async () => {
      await api.functional.communityPlatform.user.communities.moderators.create(
        connB,
        {
          communityId: community.id,
          body: {
            user_id: userA.id,
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );
}
