import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";

/**
 * Moderation queue access and filtering by moderator
 *
 * 1. Register a new member.
 * 2. Create a community as that member.
 * 3. Register a moderator account for the same community (unique email).
 * 4. Create a file upload record to fulfill moderator assignment prerequisites.
 * 5. Assign that moderator to the community using the assignment API.
 * 6. Authenticate as the moderator and query moderation queues—test various
 *    filters: a. by status b. by assigned moderator c. by community d. with
 *    pagination e. combinations thereof
 * 7. Validate that only queues from assigned communities and by assigned
 *    moderators are returned.
 * 8. Attempt as a random non-moderator (member) to access the moderation queue
 *    list—assert forbidden.
 * 9. Edge cases: filter for community/moderator with no assignment—expect empty
 *    results.
 */
export async function test_api_moderation_queue_list_access_and_filtering_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123!",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);

  // 2. Create a community as that member
  const communityName =
    RandomGenerator.name() + RandomGenerator.alphaNumeric(8);
  const communitySlug = RandomGenerator.alphaNumeric(10);
  const communityCreate =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityCreate);

  // 3. Register moderator account (different email)
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modPassword = "moderatorPW123!";
  const modJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      password: modPassword as string & tags.Format<"password">,
      community_id: communityCreate.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(modJoin);

  // 4. Create file upload as member (to ensure member entity is fully available for assignment)
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: memberJoin.id,
          original_filename: RandomGenerator.name() + ".png",
          storage_key: RandomGenerator.alphaNumeric(24),
          mime_type: "image/png",
          file_size_bytes: 4096,
          url: "https://cdn.example.com/" + RandomGenerator.alphaNumeric(24),
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);

  // 5. Assign moderator role to the community
  const assignment =
    await api.functional.communityPlatform.moderator.communities.moderatorAssignments.create(
      connection,
      {
        communityId: communityCreate.id,
        body: {
          member_id: memberJoin.id,
          role: "moderator",
          start_at: new Date().toISOString(),
          note: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // 6. Authenticate as the moderator and query moderation queues with filters
  //   Grant moderator credentials by authenticating with modEmail/modPassword
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      password: modPassword as string & tags.Format<"password">,
      community_id: communityCreate.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Retrieve queues (basic list, should only see community's queues if any)
  const queuesPage =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          community_id: communityCreate.id,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(queuesPage);
  // Validate pagination structure
  TestValidator.equals(
    "pagination community filter",
    queuesPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination community filter limit",
    queuesPage.pagination.limit,
    10,
  );

  // 7. Attempt filtering queues by status and assigned moderator
  if (queuesPage.data.length > 0) {
    const firstEntry = queuesPage.data[0];
    // Filter by status
    const statusFiltered =
      await api.functional.communityPlatform.moderator.moderationQueues.index(
        connection,
        {
          body: {
            status: firstEntry.status,
            community_id: communityCreate.id,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(statusFiltered);
    TestValidator.predicate(
      "filter by status returns only correct status",
      statusFiltered.data.every((q) => q.status === firstEntry.status),
    );
    // Filter by assigned moderator (should be null or mod's id)
    const moderatorId = firstEntry.assigned_moderator_id || modJoin.id;
    const modFiltered =
      await api.functional.communityPlatform.moderator.moderationQueues.index(
        connection,
        {
          body: {
            assigned_moderator_id: moderatorId,
            community_id: communityCreate.id,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(modFiltered);
    TestValidator.predicate(
      "filter by assigned moderator",
      modFiltered.data.every((q) => q.assigned_moderator_id === moderatorId),
    );
  }

  // 8. As a non-moderator (plain member), attempt to access moderation queues - should get error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.member.join(unauthConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "NotAllowed1@",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "non-moderator cannot access moderation queues",
    async () => {
      await api.functional.communityPlatform.moderator.moderationQueues.index(
        unauthConn,
        {
          body: {
            limit: 5,
            page: 1,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    },
  );

  // 9. Edge case: attempt to filter outside assignment scope (not assigned community)
  const fakeCommunityId = typia.random<string & tags.Format<"uuid">>();
  const outOfScope =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          community_id: fakeCommunityId,
          limit: 2,
          page: 1,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(outOfScope);
  TestValidator.equals("out of scope returns empty", outOfScope.data.length, 0);

  // 10. Edge case: filter by unassigned moderator (random UUID)
  const randomModeratorId = typia.random<string & tags.Format<"uuid">>();
  const byOtherMod =
    await api.functional.communityPlatform.moderator.moderationQueues.index(
      connection,
      {
        body: {
          assigned_moderator_id: randomModeratorId,
          community_id: communityCreate.id,
          limit: 2,
          page: 1,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(byOtherMod);
  TestValidator.equals(
    "unassigned moderator returns empty",
    byOtherMod.data.length,
    0,
  );
}
