import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorAssignment";

/**
 * Validate that a moderator can list all moderator assignments in their
 * community.
 *
 * 1. Register a new member (to become a moderator)
 * 2. Member creates a new community
 * 3. Register a moderator for the community (using member's email/password and
 *    community id)
 * 4. As the assigned moderator, perform the patch/index API to list all
 *    assignments for that community
 * 5. Validate that all assignments returned belong to the target community
 * 6. Check pagination and filtering work
 * 7. As a new member unassigned to the community, check that listing is denied
 * 8. Request with community id that does not exist and observe error/empty return
 */
export async function test_api_moderator_assignments_list_in_community_success(
  connection: api.IConnection,
) {
  // 1. Register a new member to be promoted to moderator
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(member);
  TestValidator.equals(
    "member email assigned",
    member.email,
    memberInput.email,
  );

  // 2. Member creates a new community
  const communityInput = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityInput,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community name matches",
    community.name,
    communityInput.name,
  );

  // 3. Register a moderator for the created community (with member's email/password)
  const moderatorInput = {
    email: memberInput.email,
    password: memberInput.password as string & tags.Format<"password">,
    community_id: community.id,
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorInput,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator community_id matches",
    moderator.community_id,
    community.id,
  );
  TestValidator.equals("moderator email", moderator.email, memberInput.email);

  // 4. As moderator, query index API for assignments in community
  const assignmentPage =
    await api.functional.communityPlatform.moderator.communities.moderatorAssignments.index(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(assignmentPage);
  assignmentPage.data.forEach((a) => {
    typia.assert(a);
    TestValidator.equals(
      "assignment community_id matches",
      a.community_id,
      community.id,
    );
  });
  TestValidator.predicate(
    "all assignments belong to this community",
    assignmentPage.data.every((a) => a.community_id === community.id),
  );

  // 5. Filtering: by member id, role, etc.
  if (assignmentPage.data.length > 0) {
    const filterAssignment = assignmentPage.data[0];
    const filterByMember =
      await api.functional.communityPlatform.moderator.communities.moderatorAssignments.index(
        connection,
        {
          communityId: community.id,
          body: {
            community_id: community.id,
            member_id: filterAssignment.member_id,
          },
        },
      );
    typia.assert(filterByMember);
    TestValidator.predicate(
      "filter assignments by member_id",
      filterByMember.data.every(
        (a) =>
          a.member_id === filterAssignment.member_id &&
          a.community_id === community.id,
      ),
    );
  }

  // 6. Edge case: empty result (probably after filtering non-existent member)
  const emptyPage =
    await api.functional.communityPlatform.moderator.communities.moderatorAssignments.index(
      connection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          member_id: typia.random<string & tags.Format<"uuid">>(), // random, non-existent member
        },
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty member result", emptyPage.data.length, 0);

  // 7. Non-moderator cannot list assignments
  // Register new member not part of this community
  const outsiderInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformMember.ICreate;
  const outsider = await api.functional.auth.member.join(connection, {
    body: outsiderInput,
  });
  typia.assert(outsider);
  await TestValidator.error(
    "Non-moderator cannot list assignments",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderatorAssignments.index(
        connection,
        {
          communityId: community.id,
          body: {
            community_id: community.id,
          },
        },
      );
    },
  );

  // 8. Query with non-existent community id
  await TestValidator.error(
    "Non-existent community id returns error/empty",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderatorAssignments.index(
        connection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            community_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}
