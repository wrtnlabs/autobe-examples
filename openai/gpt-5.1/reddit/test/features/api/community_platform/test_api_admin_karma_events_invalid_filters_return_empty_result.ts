import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaEvent";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaEvent";

/**
 * Validate that admin karma event search returns empty results when filters
 * match no records.
 *
 * Business goal
 *
 * - Ensure that PATCH /communityPlatform/adminUser/karmaEvents behaves gracefully
 *   for non-matching filter criteria by returning an empty
 *   IPageICommunityPlatformKarmaEvent.ISummary payload instead of an error.
 * - Confirm that pagination metadata (records, pages, current, limit) remains
 *   consistent when the underlying result set is empty.
 *
 * Scenario steps
 *
 * 1. Register an adminUser via POST /auth/adminUser/join.
 * 2. Register a memberUser via POST /auth/memberUser/join.
 * 3. As the memberUser, create a community to ensure the system is not empty.
 * 4. Log in again as adminUser via POST /auth/adminUser/login to guarantee that
 *    the Authorization header contains an admin token.
 * 5. Call PATCH /communityPlatform/adminUser/karmaEvents with a filter body whose
 *    memberuser_id is a random UUID not tied to any events, and verify that the
 *    response contains an empty data array with records=0 and pages in {0,1}.
 * 6. Call PATCH /communityPlatform/adminUser/karmaEvents again with a filter body
 *    whose min_created_at and max_created_at define a future-only window, and
 *    verify the same empty pagination behavior.
 */
export async function test_api_admin_karma_events_invalid_filters_return_empty_result(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (join) so we have admin credentials.
  const adminUsername: string = RandomGenerator.alphabets(12);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "Admin#" + RandomGenerator.alphaNumeric(10);

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoinResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoinResult);

  // 2. Register a memberUser so the platform has at least one member actor.
  const memberUsername: string = RandomGenerator.alphabets(10);
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "Member#" + RandomGenerator.alphaNumeric(8);

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword as string & tags.MinLength<8>,
    ip: null,
    href: "https://client.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberJoinResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoinResult);

  // 3. As the memberUser (current Authorization from join), create a community.
  const communityCreateBody = {
    slug: `community-${RandomGenerator.alphaNumeric(12)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: `Community ${RandomGenerator.alphabets(16)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 4. Log in as adminUser to ensure Authorization header is an admin token.
  const adminLoginBody = {
    identifier: adminUsername,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoginResult);

  // 5. Call karmaEvents.index with a memberuser_id that has no events.
  const nonexistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const emptyByMemberFilterBody = {
    memberuser_id: nonexistentMemberId,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_direction: "desc",
  } satisfies ICommunityPlatformKarmaEvent.IRequest;

  const emptyByMemberPage: IPageICommunityPlatformKarmaEvent.ISummary =
    await api.functional.communityPlatform.adminUser.karmaEvents.index(
      connection,
      {
        body: emptyByMemberFilterBody,
      },
    );
  typia.assert<IPageICommunityPlatformKarmaEvent.ISummary>(emptyByMemberPage);

  TestValidator.equals(
    "invalid memberuser filter returns empty data",
    emptyByMemberPage.data,
    [],
  );
  TestValidator.equals(
    "records is zero when member filter matches no events",
    emptyByMemberPage.pagination.records,
    0,
  );
  TestValidator.predicate(
    "pages is zero or one when member filter has no results",
    emptyByMemberPage.pagination.pages === 0 ||
      emptyByMemberPage.pagination.pages === 1,
  );

  // 6. Call karmaEvents.index with a date range entirely in the future.
  const now = new Date();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const futureStart = new Date(now.getTime() + oneYearMs).toISOString();
  const futureEnd = new Date(now.getTime() + oneYearMs * 2).toISOString();

  const emptyByFutureDateBody = {
    min_created_at: futureStart,
    max_created_at: futureEnd,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_direction: "desc",
  } satisfies ICommunityPlatformKarmaEvent.IRequest;

  const emptyByFutureDatePage: IPageICommunityPlatformKarmaEvent.ISummary =
    await api.functional.communityPlatform.adminUser.karmaEvents.index(
      connection,
      {
        body: emptyByFutureDateBody,
      },
    );
  typia.assert<IPageICommunityPlatformKarmaEvent.ISummary>(
    emptyByFutureDatePage,
  );

  TestValidator.equals(
    "future date range returns empty data",
    emptyByFutureDatePage.data,
    [],
  );
  TestValidator.equals(
    "records is zero for future date range",
    emptyByFutureDatePage.pagination.records,
    0,
  );
  TestValidator.predicate(
    "pages is zero or one for future date range",
    emptyByFutureDatePage.pagination.pages === 0 ||
      emptyByFutureDatePage.pagination.pages === 1,
  );

  // 7. Cross-check pagination consistency across both empty result responses.
  TestValidator.equals(
    "empty member filter and future range share same page index",
    emptyByMemberPage.pagination.current,
    emptyByFutureDatePage.pagination.current,
  );
  TestValidator.equals(
    "empty member filter and future range share same limit",
    emptyByMemberPage.pagination.limit,
    emptyByFutureDatePage.pagination.limit,
  );
}
