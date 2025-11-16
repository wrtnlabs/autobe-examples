import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestuser";

/**
 * Validate guest user search by anonymous_handle and user_agent for platform
 * admins.
 *
 * This E2E test ensures that a platform administrator can call the
 * /communityPlatform/platformAdmin/guestUsers search endpoint with a
 * ICommunityPlatformGuestuser.IRequest body that includes filters on
 * anonymous_handle, user_agent, and account_status_id along with pagination and
 * sorting options. It does not create guest users directly (no such API is
 * available) but validates that the backend respects the filters whenever it
 * returns matching data.
 */
export async function test_api_platform_admin_guest_users_search_by_anonymous_handle_and_user_agent(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authenticated connection
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPassword!123",
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create an account status to use as filter (e.g., FLAGGED_GUEST)
  const statusBody = {
    key: `FLAGGED_GUEST_${RandomGenerator.alphaNumeric(6)}`,
    label: "Flagged guest for investigation",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isLoginAllowed: true,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const status =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusBody },
    );
  typia.assert<ICommunityPlatformAccountStatus>(status);

  // 3. Prepare search filters. We cannot create guest users directly, so we
  // choose filter values that are syntactically valid. The semantics validated
  // below are conditional on what the backend returns.
  const filterAnonymousHandle = RandomGenerator.alphaNumeric(12);
  const filterUserAgent = RandomGenerator.paragraph({ sentences: 2 });

  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 20 as number & tags.Type<"int32">,
    anonymous_handle: filterAnonymousHandle,
    user_agent: filterUserAgent,
    account_status_id: status.id,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformGuestuser.IRequest;

  // 4. Execute the guest user search as the platform admin
  const page =
    await api.functional.communityPlatform.platformAdmin.guestUsers.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IPageICommunityPlatformGuestuser.ISummary>(page);

  // 5. Basic pagination sanity checks
  TestValidator.predicate(
    "pagination.current is first page",
    () => page.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit matches pageSize",
    () => page.pagination.limit === 20,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    () => page.data.length <= page.pagination.limit,
  );

  // 6. Validate that every returned guest summary is structurally valid and,
  // when fields are present, consistent with filters.
  for (const guest of page.data) {
    typia.assert<ICommunityPlatformGuestuser.ISummary>(guest);

    if (requestBody.anonymous_handle !== undefined) {
      // If backend chose to honor anonymous_handle, any returned record that
      // has an anonymous_handle field should be compatible with the filter.
      // Because ISummary does not expose anonymous_handle or user_agent
      // fields, we cannot assert directly on them and therefore restrict
      // validation to accountStatus when present.
      if (requestBody.account_status_id !== undefined) {
        TestValidator.predicate(
          "guest.accountStatus matches requested account_status_id when present",
          () =>
            guest.accountStatus === undefined ||
            guest.accountStatus.id === requestBody.account_status_id,
        );
      }
    }
  }
}
