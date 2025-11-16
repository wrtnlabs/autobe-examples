import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAccountRestriction";

/**
 * E2E: adminUser lists account restrictions for a memberUser with filters and
 * pagination.
 *
 * Business flow:
 *
 * 1. Create an adminUser via /auth/adminUser/join; keep its id and credentials.
 * 2. Create a memberUser via /auth/memberUser/join; keep username and credentials.
 * 3. Log in as the memberUser and create a community to simulate real usage and
 *    ensure the member actor is properly established.
 * 4. Switch back to adminUser by calling /auth/adminUser/login using the stored
 *    admin credentials.
 * 5. Create multiple restriction episodes for this memberUser by calling POST
 *    /communityPlatform/adminUser/memberUsers/{username}/accountRestrictions
 *    three times with ICommunityPlatformAccountRestriction.ICreate bodies where
 *    account_type is "memberUser", scope and reason_category are varied
 *    strings, and starts_at is now while ends_at is some time in the future.
 * 6. Build an ICommunityPlatformAccountRestriction.IRequest search body for the
 *    target username that sets:
 *
 *    - Page=1, limit large enough (e.g., 20),
 *    - Subject_username to the member username,
 *    - Subject_type to "memberUser",
 *    - Is_active to true,
 *    - Created_at_gte to a timestamp just before we created restrictions,
 *    - Created_at_lte to a timestamp a little after. Also set sort_by="created_at"
 *         and sort_direction="desc".
 * 7. Call PATCH
 *    /communityPlatform/adminUser/memberUsers/{username}/accountRestrictions
 *    with that search body via
 *    api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.index.
 * 8. Assert that:
 *
 *    - Typia.assert on the response passes,
 *    - Pagination.current is 1, pagination.limit is our requested limit,
 *    - Pagination.records >= number of created restrictions for this user,
 *    - Pagination.pages is >= 1.
 * 9. Check that the returned data array contains at least the restrictions we just
 *    created, by matching their id values. Confirm for each matched summary:
 *
 *    - Account_type === "memberUser",
 *    - Created_by_adminuser.id equals our adminUser.id,
 *    - Created_by_adminuser.displayName is a non-empty string,
 *    - Started_at and created_at are valid ISO date-time strings.
 * 10. Create a second memberUser with no restrictions and perform another index
 *     call for that username using the same filters. Assert that the returned
 *     pagination.records is 0 and data is an empty array, verifying that
 *     scoping by username works.
 */
export async function test_api_memberuser_account_restrictions_index_by_adminuser(
  connection: api.IConnection,
) {
  // 1. Create adminUser (join)
  const adminUsername = RandomGenerator.alphabets(10);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin!234";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create first memberUser (target of restrictions)
  const memberUsername = RandomGenerator.alphabets(10);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member!234";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 3. As memberUser, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 4. Switch back to adminUser with explicit login
  const adminLoginBody = {
    identifier: adminUsername,
    password: adminPassword,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn = await api.functional.auth.adminUser.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoggedIn);

  // 5. Create multiple restrictions for this memberUser via adminUser/memberUsers/{username}/accountRestrictions
  const now = new Date();
  const startsAt = now.toISOString();
  const future = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const restrictionPayloads = [
    {
      account_type: "memberUser",
      scope: "posting",
      reason_category: "abuse",
      reason_detail: "Posting abusive content",
      starts_at: startsAt,
      ends_at: future,
    },
    {
      account_type: "memberUser",
      scope: "commenting",
      reason_category: "spam",
      reason_detail: "Comment spam",
      starts_at: startsAt,
      ends_at: future,
    },
    {
      account_type: "memberUser",
      scope: "login",
      reason_category: "security",
      reason_detail: "Security incident",
      starts_at: startsAt,
      ends_at: future,
    },
  ] satisfies ICommunityPlatformAccountRestriction.ICreate[];

  const createdRestrictions: ICommunityPlatformAccountRestriction[] = [];

  for (const payload of restrictionPayloads) {
    const created =
      await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
        connection,
        {
          username: memberUsername,
          body: payload,
        },
      );
    typia.assert<ICommunityPlatformAccountRestriction>(created);
    createdRestrictions.push(created);
  }

  // 6. Build search request body for index
  const createdAtLowerBound = new Date(
    now.getTime() - 5 * 60 * 1000,
  ).toISOString();
  const createdAtUpperBound = new Date(
    now.getTime() + 5 * 60 * 1000,
  ).toISOString();

  const indexRequestBodyForMember = {
    page: 1,
    limit: 20,
    sort_by: "created_at",
    sort_direction: "desc",
    subject_username: memberUsername,
    subject_type: "memberUser",
    restriction_type: null,
    is_active: true,
    effective_from_gte: null,
    effective_from_lte: null,
    effective_until_gte: null,
    effective_until_lte: null,
    reason_category: null,
    created_at_gte: createdAtLowerBound,
    created_at_lte: createdAtUpperBound,
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const pageForMember =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.index(
      connection,
      {
        username: memberUsername,
        body: indexRequestBodyForMember,
      },
    );
  typia.assert<IPageICommunityPlatformAccountRestriction.ISummary>(
    pageForMember,
  );

  // 7. Basic pagination assertions
  TestValidator.equals(
    "pagination current page should be 1",
    pageForMember.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    pageForMember.pagination.limit,
    indexRequestBodyForMember.limit,
  );
  TestValidator.predicate(
    "records should be at least number of created restrictions",
    pageForMember.pagination.records >= createdRestrictions.length,
  );
  TestValidator.predicate(
    "pages should be >= 1",
    pageForMember.pagination.pages >= 1,
  );

  // 8. Verify that created restrictions appear in data
  const summaries = pageForMember.data;
  TestValidator.predicate(
    "data array should contain at least as many entries as created restrictions",
    summaries.length >= createdRestrictions.length,
  );

  for (const summary of summaries) {
    typia.assert<ICommunityPlatformAccountRestriction.ISummary>(summary);
    TestValidator.equals(
      "summary account_type should be memberUser",
      summary.account_type,
      "memberUser",
    );
    TestValidator.predicate(
      "summary status must be one of allowed enum values",
      summary.status === "pending" ||
        summary.status === "active" ||
        summary.status === "expired" ||
        summary.status === "cancelled" ||
        summary.status === "rejected",
    );
    TestValidator.predicate(
      "summary started_at should be non-empty",
      summary.started_at.length > 0,
    );
    TestValidator.predicate(
      "summary created_at should be non-empty",
      summary.created_at.length > 0,
    );
    TestValidator.equals(
      "created_by_adminuser.id should equal admin id",
      summary.created_by_adminuser.id,
      adminAuthorized.id,
    );
    TestValidator.predicate(
      "created_by_adminuser.displayName should be non-empty",
      summary.created_by_adminuser.displayName.length > 0,
    );
  }

  for (const created of createdRestrictions) {
    const matched = summaries.find((s) => s.id === created.id);
    TestValidator.predicate(
      "each created restriction should appear in index list",
      matched !== undefined,
    );
  }

  // 9. Create a second memberUser with no restrictions
  const anotherMemberUsername = RandomGenerator.alphabets(10);
  const anotherMemberEmail = typia.random<string & tags.Format<"email">>();

  const anotherMemberJoinBody = {
    username: anotherMemberUsername,
    email: anotherMemberEmail,
    password: memberPassword,
    ip: null,
    href: "https://example.com/join2",
    referrer: "https://example.com/landing2",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const anotherMemberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: anotherMemberJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(
    anotherMemberAuthorized,
  );

  const indexRequestBodyForEmpty = {
    page: 1,
    limit: 20,
    sort_by: "created_at",
    sort_direction: "desc",
    subject_username: anotherMemberUsername,
    subject_type: "memberUser",
    restriction_type: null,
    is_active: true,
    effective_from_gte: null,
    effective_from_lte: null,
    effective_until_gte: null,
    effective_until_lte: null,
    reason_category: null,
    created_at_gte: createdAtLowerBound,
    created_at_lte: createdAtUpperBound,
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const pageForEmpty =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.index(
      connection,
      {
        username: anotherMemberUsername,
        body: indexRequestBodyForEmpty,
      },
    );
  typia.assert<IPageICommunityPlatformAccountRestriction.ISummary>(
    pageForEmpty,
  );

  TestValidator.equals(
    "empty member should have zero records",
    pageForEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty member should have empty data array",
    pageForEmpty.data.length,
    0,
  );
}
