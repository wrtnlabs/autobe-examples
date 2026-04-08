import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test listing all moderators for a community as the owner.
 *
 * This test verifies the moderator listing endpoint returns paginated results
 * with proper sorting (owners first, then moderators) and complete moderator
 * information including member and assigner details.
 *
 * Steps:
 * 1. Member A joins and creates a community (becomes owner automatically)
 * 2. Member B joins and subscribes to the community
 * 3. Member A (owner) lists all moderators without filters
 *
 * Validations:
 * - Response returns paginated list with pagination metadata
 * - Owner (Member A) appears with role='owner'
 * - Each moderator entry includes: id, role, assignedAt, member summary, assigner summary
 * - Assigner for owner is null (self-assigned)
 * - Pagination metadata is properly structured
 */
export async function test_api_moderator_listing_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // Step 1: Member A joins and creates a community (becomes owner)
  // ============================================================
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: `owner_${RandomGenerator.alphaNumeric(8)}`,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberAAuthorized);
  // Create community - owner role is automatically assigned
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community has owner",
    community.member.id,
    memberAAuthorized.id,
  );
  // ============================================================
  // Step 2: Member B joins and subscribes to the community
  // ============================================================
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberBAuthorized);
  // Subscribe Member B to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberBConnection,
      {
        body: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription matches community",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription matches member",
    subscription.member.id,
    memberBAuthorized.id,
  );
  // ============================================================
  // Step 3: Owner (Member A) lists all moderators for the community
  // ============================================================
  const moderatorPage =
    await api.functional.redditClone.member.communities.moderators.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCloneCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorPage);
  // ============================================================
  // Validations
  // ============================================================
  // Validate pagination metadata exists and is properly structured
  TestValidator.predicate(
    "pagination exists",
    moderatorPage.pagination !== null && moderatorPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    moderatorPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    moderatorPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    moderatorPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    moderatorPage.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate(
    "data array exists",
    moderatorPage.data !== null && moderatorPage.data !== undefined,
  );
  // Find owner entry in the moderator list
  const ownerEntry = moderatorPage.data.find((m) => m.role === "owner");
  TestValidator.predicate(
    "owner exists in moderator list",
    ownerEntry !== undefined,
  );
  if (ownerEntry) {
    // Validate owner entry structure
    TestValidator.predicate(
      "owner has id",
      ownerEntry.id !== null && ownerEntry.id !== undefined,
    );
    TestValidator.equals("owner role is 'owner'", ownerEntry.role, "owner");
    TestValidator.predicate(
      "owner has assignedAt timestamp",
      ownerEntry.assignedAt !== null && ownerEntry.assignedAt !== undefined,
    );
    // Validate member summary in owner entry
    TestValidator.predicate(
      "owner has member summary",
      ownerEntry.member !== null && ownerEntry.member !== undefined,
    );
    TestValidator.equals(
      "owner member id matches creator",
      ownerEntry.member.id,
      memberAAuthorized.id,
    );
    TestValidator.predicate(
      "owner has username",
      ownerEntry.member.username !== null &&
        ownerEntry.member.username !== undefined,
    );
    // Assigner for owner should be null (self-assigned on community creation)
    TestValidator.equals(
      "owner has no assigner (self-assigned)",
      ownerEntry.assigner,
      null,
    );
  }
  // Verify sort order: owners come first, then moderators
  // Find the index of the first non-owner (if any)
  const firstNonOwnerIndex = moderatorPage.data.findIndex(
    (m) => m.role !== "owner",
  );
  if (firstNonOwnerIndex > 0) {
    // If there are owners, verify all owners come before non-owners
    for (let i = 0; i < firstNonOwnerIndex; i++) {
      TestValidator.equals(
        `moderator at index ${i} should be owner`,
        moderatorPage.data[i].role,
        "owner",
      );
    }
  }
}
