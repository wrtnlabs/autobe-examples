import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_moderator_snapshot } from "../../../prepare/prepare_random_reddit_clone_moderator_snapshot";

/**
 * Test pagination and sorting for moderator listing.
 *
 * 1. Authenticate as member using /auth/member/join
 * 2. Create a community
 * 3. Create and add multiple moderators (3-5) to the community
 * 4. Test pagination: request first page with limit=2, verify 2 results
 * 5. Test pagination: request second page with limit=2, verify remaining results
 * 6. Test sorting by createdAt descending (default), verify newest first
 * 7. Test sorting by role alphabetically, verify 'moderator' before 'owner'
 * 8. Test order=asc for createdAt, verify oldest first
 * 9. Verify pagination metadata is correct throughout
 */
export async function test_api_moderator_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner using utility function
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(10),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 2. Create a community with the owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `test-community-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create and add 3 moderators to the community
  const moderatorUsernames: string[] = [];
  for (let i = 0; i < 3; i++) {
    const modConnection: api.IConnection = { host: connection.host };
    const modAuth = await authorize_member_join(modConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: `mod${RandomGenerator.alphabets(8)}`,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      },
    });
    moderatorUsernames.push(modAuth.username);
    // Add this user as moderator
    const moderatorAssignment =
      await api.functional.redditClone.member.communities.moderators.create(
        ownerConnection,
        {
          communityName: community.name,
          body: {
            memberUsername: modAuth.username,
          } satisfies IRedditCloneModeratorSnapshot.ICreate,
        },
      );
    typia.assert(moderatorAssignment);
    // Small delay to ensure different created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // 4. Test pagination: request first page with limit=2
  const page1 = await api.functional.redditClone.communities.moderators.index(
    ownerConnection,
    {
      communityName: community.name,
      body: {
        limit: 2,
        page: 1,
      } satisfies IRedditCloneCommunityModerator.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 has 2 items", page1.data.length, 2);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.equals("page 1 records total", page1.pagination.records, 4);
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 2);
  // 5. Test pagination: request second page with limit=2
  const page2 = await api.functional.redditClone.communities.moderators.index(
    ownerConnection,
    {
      communityName: community.name,
      body: {
        limit: 2,
        page: 2,
      } satisfies IRedditCloneCommunityModerator.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 has 2 items", page2.data.length, 2);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 records total", page2.pagination.records, 4);
  // 6. Test sorting by createdAt descending (default), verify newest first
  const descSorted =
    await api.functional.redditClone.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          limit: 10,
          sort: "createdAt",
          order: "desc",
        } satisfies IRedditCloneCommunityModerator.IRequest,
      },
    );
  typia.assert(descSorted);
  const descTimestamps = descSorted.data.map((m) =>
    new Date(m.createdAt).getTime(),
  );
  const isDescSorted = descTimestamps.every(
    (timestamp, index) => index === 0 || timestamp <= descTimestamps[index - 1],
  );
  TestValidator.predicate(
    "moderators sorted by createdAt descending (newest first)",
    isDescSorted,
  );
  // 7. Test sorting by role alphabetically, verify 'moderator' before 'owner'
  const roleSorted =
    await api.functional.redditClone.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          limit: 10,
          sort: "role",
          order: "asc",
        } satisfies IRedditCloneCommunityModerator.IRequest,
      },
    );
  typia.assert(roleSorted);
  const roleOrder = roleSorted.data.map((m) => m.role);
  TestValidator.equals("role sorted alphabetically", roleOrder, [
    "moderator",
    "moderator",
    "moderator",
    "owner",
  ]);
  // 8. Test order=asc for createdAt, verify oldest first
  const ascSorted =
    await api.functional.redditClone.communities.moderators.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          limit: 10,
          sort: "createdAt",
          order: "asc",
        } satisfies IRedditCloneCommunityModerator.IRequest,
      },
    );
  typia.assert(ascSorted);
  const ascTimestamps = ascSorted.data.map((m) =>
    new Date(m.createdAt).getTime(),
  );
  const isAscSorted = ascTimestamps.every(
    (timestamp, index) => index === 0 || timestamp >= ascTimestamps[index - 1],
  );
  TestValidator.predicate(
    "moderators sorted by createdAt ascending (oldest first)",
    isAscSorted,
  );
}
