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
 * Test assigning multiple moderators to a single community to build a
 * moderation team.
 *
 * This test validates the complete workflow for building a multi-moderator
 * team:
 *
 * 1. Founding moderator creates account and community
 * 2. Additional moderator accounts are created
 * 3. Each moderator is sequentially assigned to the community
 * 4. Assignment records are validated for uniqueness
 * 5. Complete moderator list is retrieved and verified
 * 6. Moderator access to the community is confirmed
 */
export async function test_api_moderator_assignment_multiple_moderators(
  connection: api.IConnection,
) {
  // Step 1: Create founding moderator account and authenticate
  const founderEmail = typia.random<string & tags.Format<"email">>();
  const founderPassword = "founder_pass_123";
  const founderNickname = RandomGenerator.name();

  const founder = await api.functional.auth.moderator.join(connection, {
    body: {
      email: founderEmail,
      password: founderPassword,
      nickname: founderNickname,
      href: "https://reddit-community.test/join",
      referrer: "https://reddit-community.test/",
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(founder);

  // Step 2: Create a community (founder is automatically the first moderator)
  const communityName = RandomGenerator.alphaNumeric(15).toLowerCase();
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          rules: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 6,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  TestValidator.equals("community name matches", community.name, communityName);

  // Step 3: Create 3 additional moderator accounts
  const additionalModerators: IRedditCommunityCommunityModerator.IAuthorized[] =
    [];

  for (let i = 0; i < 3; i++) {
    const moderator = await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: `moderator_pass_${i}`,
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.test/join",
        referrer: "https://reddit-community.test/",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
    typia.assert(moderator);
    additionalModerators.push(moderator);
  }

  TestValidator.equals(
    "created 3 additional moderators",
    additionalModerators.length,
    3,
  );

  // Step 4: Sequentially assign each moderator to the community
  const assignmentRecords: IRedditCommunityCommunityModerator[] = [];

  for (const moderator of additionalModerators) {
    const assignment =
      await api.functional.redditCommunity.moderator.communities.moderators.create(
        connection,
        {
          communityName: communityName,
          body: {
            email: moderator.email,
            password: `assignment_${moderator.username}`,
            nickname: moderator.nickname,
            href: "https://reddit-community.test/moderator-assign",
            referrer: "https://reddit-community.test/community",
          } satisfies IRedditCommunityCommunityModerator.ICreate,
        },
      );
    typia.assert(assignment);
    assignmentRecords.push(assignment);
  }

  // Step 5: Verify each assignment returns a unique moderator assignment record
  TestValidator.equals(
    "all assignments completed",
    assignmentRecords.length,
    3,
  );

  const assignmentIds = assignmentRecords.map((record) => record.id);
  const uniqueIds = new Set(assignmentIds);
  TestValidator.equals("all assignment IDs are unique", uniqueIds.size, 3);

  // Step 6: Retrieve the community moderator list
  const moderatorList =
    await api.functional.redditCommunity.communities.moderators.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 10,
          sort: "assigned_at_asc",
        } satisfies IRedditCommunityCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorList);

  // Step 7: Validate all assigned moderators appear in the list (founder + 3 additional)
  TestValidator.predicate(
    "moderator list contains at least 4 moderators",
    moderatorList.data.length >= 4,
  );

  // Verify founder is in the list
  const founderInList = moderatorList.data.find((mod) => mod.id === founder.id);
  TestValidator.predicate(
    "founder is in moderator list",
    founderInList !== undefined,
  );

  // Verify all 3 additional moderators are in the list
  for (const moderator of additionalModerators) {
    const moderatorInList = moderatorList.data.find(
      (mod) => mod.username === moderator.username,
    );
    TestValidator.predicate(
      `moderator ${moderator.username} is in the list`,
      moderatorInList !== undefined,
    );
  }

  // Step 8: Confirm each moderator has proper access to the community
  TestValidator.predicate(
    "all moderators successfully assigned to community",
    moderatorList.data.length === additionalModerators.length + 1,
  );
}
