import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfile";

/**
 * Validate admin-only platform profile search and discovery
 *
 * This test registers a new platform admin, exercises a variety of search and
 * pagination scenarios for user profile discovery as an admin (including
 * filtering by username, privacy/visibility, status, and timestamps), verifies
 * ascending and descending sort orders, edge-case pagination, and validates
 * that only admins can see private profiles. It also confirms access controls
 * prevent unauthorized/non-admin profile discovery.
 *
 * Steps:
 *
 * 1. Register admin
 * 2. Fetch full profile list (no filters/paginate)
 * 3. Search by username (pick real username from list)
 * 4. Search with isPublic=false filter, confirm private profiles appear
 * 5. Paginate and check expected slices
 * 6. Sort asc/desc by created_at
 * 7. Search by statusMessage/createdAfter/createdBefore if data allows
 * 8. Edge cases: limit=100, page>max, fake username (expect empty)
 * 9. Confirm private profiles are NOT accessible as non-admin (access denied)
 * 10. Typia.assert on all responses, TestValidator.equals/edge-case validation
 */
export async function test_api_admin_profile_search_and_discovery(
  connection: api.IConnection,
) {
  // 1. Register platform admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals("admin email should match", admin.email, adminEmail);
  TestValidator.predicate("admin superuser true", admin.superuser === true);

  // 2. Fetch all profiles with no filters (default pagination)
  const profilesAll =
    await api.functional.communityPlatform.admin.profiles.index(connection, {
      body: {} satisfies ICommunityPlatformProfile.IRequest,
    });
  typia.assert(profilesAll);
  TestValidator.predicate(
    "pagination current page is >= 1",
    profilesAll.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is between 1-100",
    profilesAll.pagination.limit >= 1 && profilesAll.pagination.limit <= 100,
  );
  TestValidator.predicate("pages > 0", profilesAll.pagination.pages > 0);
  TestValidator.predicate(
    "profiles are array",
    Array.isArray(profilesAll.data),
  );

  if (profilesAll.data.length > 0) {
    // 3. Search by existing username
    const foundUsername = profilesAll.data[0].username;
    const usernameSearch =
      await api.functional.communityPlatform.admin.profiles.index(connection, {
        body: {
          username: foundUsername,
        } satisfies ICommunityPlatformProfile.IRequest,
      });
    typia.assert(usernameSearch);
    TestValidator.predicate(
      "search by username returns >= 1",
      usernameSearch.data.some((p) => p.username === foundUsername),
    );

    // 4. Search with isPublic=false
    const privateSearch =
      await api.functional.communityPlatform.admin.profiles.index(connection, {
        body: { isPublic: false } satisfies ICommunityPlatformProfile.IRequest,
      });
    typia.assert(privateSearch);
    TestValidator.predicate(
      "admin can see private profiles",
      privateSearch.data.some((p) => p.is_public === false),
    );

    // 5. Paginate: page=2, limit=2 (if enough results)
    if (
      profilesAll.pagination.pages >= 2 &&
      profilesAll.pagination.limit >= 2
    ) {
      const page2 = await api.functional.communityPlatform.admin.profiles.index(
        connection,
        {
          body: {
            page: 2,
            limit: 2,
          } satisfies ICommunityPlatformProfile.IRequest,
        },
      );
      typia.assert(page2);
      TestValidator.predicate(
        "page 2: current page is 2",
        page2.pagination.current === 2,
      );
      TestValidator.predicate(
        "page 2: up to 2 results",
        page2.data.length <= 2,
      );
    }

    // 6. Sort by created_at asc/desc and compare
    const sortAsc = await api.functional.communityPlatform.admin.profiles.index(
      connection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies ICommunityPlatformProfile.IRequest,
      },
    );
    const sortDesc =
      await api.functional.communityPlatform.admin.profiles.index(connection, {
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies ICommunityPlatformProfile.IRequest,
      });
    typia.assert(sortAsc);
    typia.assert(sortDesc);
    if (sortAsc.data.length > 1) {
      TestValidator.predicate(
        "asc sorted created_at <= next",
        sortAsc.data.every(
          (p, i, arr) => i === 0 || p.created_at >= arr[i - 1].created_at,
        ),
      );
      TestValidator.predicate(
        "desc sorted created_at >= next",
        sortDesc.data.every(
          (p, i, arr) => i === 0 || p.created_at <= arr[i - 1].created_at,
        ),
      );
    }

    // 7. Filter by statusMessage/createdAfter/createdBefore if possible
    const aProfile = profilesAll.data.find((p) => p.status_message);
    if (aProfile && aProfile.status_message) {
      const filterByStatus =
        await api.functional.communityPlatform.admin.profiles.index(
          connection,
          {
            body: {
              statusMessage: aProfile.status_message,
            } satisfies ICommunityPlatformProfile.IRequest,
          },
        );
      typia.assert(filterByStatus);
      TestValidator.predicate(
        "status message search",
        filterByStatus.data.every(
          (p) => p.status_message === aProfile.status_message,
        ),
      );
    }
    const createdBefore = profilesAll.data[0].created_at;
    const filterByTime =
      await api.functional.communityPlatform.admin.profiles.index(connection, {
        body: { createdBefore } satisfies ICommunityPlatformProfile.IRequest,
      });
    typia.assert(filterByTime);
    TestValidator.predicate(
      "createdBefore <= first profile",
      filterByTime.data.every((p) => p.created_at <= createdBefore),
    );
  }

  // 8. Edge: Search with limit=100
  const maxLimit = await api.functional.communityPlatform.admin.profiles.index(
    connection,
    { body: { limit: 100 } satisfies ICommunityPlatformProfile.IRequest },
  );
  typia.assert(maxLimit);
  TestValidator.predicate("limit 100 max", maxLimit.data.length <= 100);

  // 8b. Edge: page>max (should empty)
  const highPage = await api.functional.communityPlatform.admin.profiles.index(
    connection,
    { body: { page: 9999 } satisfies ICommunityPlatformProfile.IRequest },
  );
  typia.assert(highPage);
  TestValidator.predicate(
    "high page should be empty",
    highPage.data.length === 0,
  );

  // 8c. Edge: Fake username (empty)
  const fakeSearch =
    await api.functional.communityPlatform.admin.profiles.index(connection, {
      body: {
        username: "!!!notarealuser###",
      } satisfies ICommunityPlatformProfile.IRequest,
    });
  typia.assert(fakeSearch);
  TestValidator.predicate(
    "search fake username returns nothing",
    fakeSearch.data.length === 0,
  );

  // 9. Access control: Non-admin cannot access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin access denied", async () => {
    await api.functional.communityPlatform.admin.profiles.index(unauthConn, {
      body: {} satisfies ICommunityPlatformProfile.IRequest,
    });
  });
}
