import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test modifying community privacy settings from public to private and vice
 * versa.
 *
 * This test validates the workflow of changing community privacy settings
 * through the moderator API. The test creates a public community, subscribes
 * members to it, then changes the privacy setting to private and back to
 * public, validating that the privacy changes take effect immediately.
 *
 * Workflow steps:
 *
 * 1. Register moderator and create public community
 * 2. Register multiple members and subscribe them to the community
 * 3. Change community privacy from public to private (as moderator)
 * 4. Verify privacy change took effect
 * 5. Change community privacy back to public
 * 6. Verify privacy change back to public took effect
 */
export async function test_api_community_privacy_settings_modification(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate moderator member
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a public community
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        privacy_type: "public",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals(
    "community created as public",
    community.privacy_type,
    "public",
  );

  // Step 3: Register and subscribe multiple members to the public community
  const memberCount = 3;
  const subscriptions: IRedditLikeCommunitySubscription[] = [];

  for (let i = 0; i < memberCount; i++) {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = typia.random<string & tags.MinLength<8>>();

    const member: IRedditLikeMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          username: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z0-9_-]+$">
          >(),
          email: memberEmail,
          password: memberPassword,
        } satisfies IRedditLikeMember.ICreate,
      });
    typia.assert(member);

    // Subscribe to the public community
    const subscription: IRedditLikeCommunitySubscription =
      await api.functional.redditLike.member.communities.subscribe.create(
        connection,
        {
          communityId: community.id,
        },
      );
    typia.assert(subscription);
    TestValidator.equals(
      "subscription community ID matches",
      subscription.community_id,
      community.id,
    );
    TestValidator.equals(
      "subscription member ID matches",
      subscription.member_id,
      member.id,
    );
    subscriptions.push(subscription);
  }

  TestValidator.equals(
    "all members subscribed",
    subscriptions.length,
    memberCount,
  );

  // Step 4: Change community privacy from public to private
  // Note: The moderator is still authenticated from Step 1
  const privateUpdate: IRedditLikeCommunity =
    await api.functional.redditLike.moderator.communities.update(connection, {
      communityId: community.id,
      body: {
        privacy_type: "private",
      } satisfies IRedditLikeCommunity.IUpdate,
    });
  typia.assert(privateUpdate);
  TestValidator.equals(
    "community changed to private",
    privateUpdate.privacy_type,
    "private",
  );
  TestValidator.equals(
    "community ID unchanged",
    privateUpdate.id,
    community.id,
  );
  TestValidator.equals(
    "community code unchanged",
    privateUpdate.code,
    community.code,
  );

  // Step 5: Change community privacy back to public
  const publicUpdate: IRedditLikeCommunity =
    await api.functional.redditLike.moderator.communities.update(connection, {
      communityId: community.id,
      body: {
        privacy_type: "public",
      } satisfies IRedditLikeCommunity.IUpdate,
    });
  typia.assert(publicUpdate);
  TestValidator.equals(
    "community changed back to public",
    publicUpdate.privacy_type,
    "public",
  );
  TestValidator.equals(
    "community ID unchanged after second update",
    publicUpdate.id,
    community.id,
  );
  TestValidator.equals(
    "community code still unchanged",
    publicUpdate.code,
    community.code,
  );

  // Step 6: Create a new member and verify subscription to the now-public community
  const newMemberEmail = typia.random<string & tags.Format<"email">>();
  const newMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: newMemberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(newMember);

  const newSubscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: community.id,
      },
    );
  typia.assert(newSubscription);
  TestValidator.equals(
    "new member subscribed to public community",
    newSubscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "new subscription member ID matches",
    newSubscription.member_id,
    newMember.id,
  );
}
