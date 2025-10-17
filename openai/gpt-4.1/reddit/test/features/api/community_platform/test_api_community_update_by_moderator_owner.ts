import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate that only a properly assigned moderator can update a community and
 * that unauthorized updates are rejected.
 *
 * 1. Register a new member and create a community as that member.
 * 2. Register a moderator (with the same email as the member) for the new
 *    community.
 * 3. As the assigned moderator, update the community
 *    (title/description/status/slug) and verify updates.
 * 4. Register another unrelated member and moderator (for a different random
 *    community).
 * 5. Attempt to update the original community as this unrelated moderator and
 *    verify denial (authorization error).
 */
export async function test_api_community_update_by_moderator_owner(
  connection: api.IConnection,
) {
  // 1. Register member and create a community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  const communityCreate = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // 2. Register moderator (member -> moderator) for the community
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password: moderatorPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // 3. As assigned moderator, update community
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedStatus = "private";
  const updatedSlug = RandomGenerator.alphaNumeric(15);
  const communityUpdateBody = {
    title: updatedTitle,
    description: updatedDescription,
    slug: updatedSlug,
    status: updatedStatus,
  } satisfies ICommunityPlatformCommunity.IUpdate;
  const updated =
    await api.functional.communityPlatform.moderator.communities.update(
      connection,
      {
        communityId: community.id,
        body: communityUpdateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("community title updated", updated.title, updatedTitle);
  TestValidator.equals(
    "community description updated",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "community status updated",
    updated.status,
    updatedStatus,
  );
  TestValidator.equals("community slug updated", updated.slug, updatedSlug);
  TestValidator.predicate(
    "community updated_at timestamp is changed",
    updated.updated_at !== community.updated_at,
  );

  // 4. Register another unrelated member & create another community
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMemberPassword = RandomGenerator.alphaNumeric(12);
  const otherMember = await api.functional.auth.member.join(connection, {
    body: {
      email: otherMemberEmail,
      password: otherMemberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(otherMember);
  const otherCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);
  // Register other unrelated moderator for this different community
  const unrelatedModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: otherMemberEmail,
        password: RandomGenerator.alphaNumeric(12),
        community_id: otherCommunity.id,
      } satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  typia.assert(unrelatedModerator);

  // 5. Attempt to update the original community as unrelated moderator
  // Authenticate as unrelated moderator (uses Authorization header) by calling their join, already done
  await TestValidator.error(
    "unrelated moderator denied updating other's community",
    async () => {
      await api.functional.communityPlatform.moderator.communities.update(
        connection,
        {
          communityId: community.id,
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
}
