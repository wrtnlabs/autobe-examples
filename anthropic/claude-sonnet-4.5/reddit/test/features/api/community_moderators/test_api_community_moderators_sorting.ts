import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test sorting functionality for moderator lists.
 *
 * This test validates that community moderator lists can be sorted by different
 * criteria:
 *
 * - Assigned_at_asc: Moderators sorted by assignment date, oldest first
 * - Assigned_at_desc: Moderators sorted by assignment date, newest first
 * - Username_asc: Moderators sorted alphabetically by username (A-Z)
 * - Username_desc: Moderators sorted alphabetically by username (Z-A)
 *
 * The test ensures sorting maintains data integrity and all moderators appear
 * correctly in each sorted view, supporting various UI use cases for community
 * management.
 *
 * Test workflow:
 *
 * 1. Create first moderator account and authenticate
 * 2. Create a community (first moderator becomes founder)
 * 3. Create multiple moderator accounts with alphabetically distinct usernames
 * 4. Assign moderators to the community in sequence
 * 5. Request moderator list with each sort order
 * 6. Validate the ordering matches the expected sort criteria
 * 7. Ensure all moderators appear in each sorted list
 */
export async function test_api_community_moderators_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first moderator (community founder)
  const founderEmail = typia.random<string & tags.Format<"email">>();
  const founderData = {
    email: founderEmail,
    password: "SecurePass123!",
    nickname: "founder_mod",
    href: "https://test.example.com/register",
    referrer: "https://test.example.com/home",
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const founder = await api.functional.auth.moderator.join(connection, {
    body: founderData,
  });
  typia.assert(founder);

  // Step 2: Create a community
  const communityName = `testsort${RandomGenerator.alphaNumeric(8)}`;
  const communityData = {
    name: communityName,
    display_title: "Sorting Test Community",
    description: "Community for testing moderator sorting functionality",
    rules: "Follow platform guidelines",
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // Step 3: Create additional moderator accounts with alphabetically distinct usernames
  const moderatorUsernames = ["alice", "charlie", "bob"] as const;
  const additionalModerators: IRedditCommunityCommunityModerator.IAuthorized[] =
    [];

  for (const username of moderatorUsernames) {
    const modEmail = typia.random<string & tags.Format<"email">>();
    const modData = {
      email: modEmail,
      password: "SecurePass123!",
      nickname: username,
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/home",
    } satisfies IRedditCommunityCommunityModerator.ICreate;

    const moderator = await api.functional.auth.moderator.join(connection, {
      body: modData,
    });
    typia.assert(moderator);
    additionalModerators.push(moderator);
  }

  // Step 4: Switch back to founder authentication and assign moderators
  const founderReauth = await api.functional.auth.moderator.join(connection, {
    body: founderData,
  });
  typia.assert(founderReauth);

  // Assign each moderator to the community
  for (const moderator of additionalModerators) {
    const assignmentData = {
      email: moderator.email,
      password: "SecurePass123!",
      nickname: moderator.nickname,
      href: "https://test.example.com/moderate",
      referrer: `https://test.example.com/community/${communityName}`,
    } satisfies IRedditCommunityCommunityModerator.ICreate;

    await api.functional.redditCommunity.moderator.communities.moderators.create(
      connection,
      {
        communityName: communityName,
        body: assignmentData,
      },
    );
  }

  // Step 5: Test assigned_at_asc sorting (oldest assignments first)
  const assignedAtAscResult =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: communityName,
        body: {
          sort: "assigned_at_asc",
          limit: 100,
        },
      },
    );
  typia.assert(assignedAtAscResult);

  TestValidator.predicate(
    "assigned_at_asc should return moderators",
    assignedAtAscResult.data.length >= 4,
  );

  // Verify chronological order by checking account creation timestamps as proxy
  for (let i = 0; i < assignedAtAscResult.data.length - 1; i++) {
    const current = new Date(assignedAtAscResult.data[i].created_at).getTime();
    const next = new Date(assignedAtAscResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `assigned_at_asc ordering check for positions ${i} and ${i + 1}`,
      current <= next,
    );
  }

  // Step 6: Test assigned_at_desc sorting (newest assignments first)
  const assignedAtDescResult =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: communityName,
        body: {
          sort: "assigned_at_desc",
          limit: 100,
        },
      },
    );
  typia.assert(assignedAtDescResult);

  TestValidator.predicate(
    "assigned_at_desc should return moderators",
    assignedAtDescResult.data.length >= 4,
  );

  // Verify reverse chronological order
  for (let i = 0; i < assignedAtDescResult.data.length - 1; i++) {
    const current = new Date(assignedAtDescResult.data[i].created_at).getTime();
    const next = new Date(
      assignedAtDescResult.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate(
      `assigned_at_desc ordering check for positions ${i} and ${i + 1}`,
      current >= next,
    );
  }

  // Step 7: Test username_asc sorting (alphabetical A-Z)
  const usernameAscResult =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: communityName,
        body: {
          sort: "username_asc",
          limit: 100,
        },
      },
    );
  typia.assert(usernameAscResult);

  TestValidator.predicate(
    "username_asc should return all moderators",
    usernameAscResult.data.length >= 4,
  );

  // Verify alphabetical order
  for (let i = 0; i < usernameAscResult.data.length - 1; i++) {
    const current = usernameAscResult.data[i].username.toLowerCase();
    const next = usernameAscResult.data[i + 1].username.toLowerCase();
    TestValidator.predicate(
      `username_asc: ${current} should be <= ${next}`,
      current <= next,
    );
  }

  // Step 8: Test username_desc sorting (alphabetical Z-A)
  const usernameDescResult =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: communityName,
        body: {
          sort: "username_desc",
          limit: 100,
        },
      },
    );
  typia.assert(usernameDescResult);

  TestValidator.predicate(
    "username_desc should return all moderators",
    usernameDescResult.data.length >= 4,
  );

  // Verify reverse alphabetical order
  for (let i = 0; i < usernameDescResult.data.length - 1; i++) {
    const current = usernameDescResult.data[i].username.toLowerCase();
    const next = usernameDescResult.data[i + 1].username.toLowerCase();
    TestValidator.predicate(
      `username_desc: ${current} should be >= ${next}`,
      current >= next,
    );
  }

  // Step 9: Verify data integrity - all sorting methods return the same count
  TestValidator.equals(
    "all sort methods should return same moderator count",
    assignedAtAscResult.data.length,
    assignedAtDescResult.data.length,
  );

  TestValidator.equals(
    "username sorts should match time-based sorts count",
    usernameAscResult.data.length,
    assignedAtAscResult.data.length,
  );
}
