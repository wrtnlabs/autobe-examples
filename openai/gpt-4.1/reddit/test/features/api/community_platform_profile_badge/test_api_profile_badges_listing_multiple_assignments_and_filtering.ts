import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileBadge";

/**
 * Test that paginated and filterable badge listing works for user profile
 * badges in the platform, including pagination meta and proper filter
 * application.
 *
 * - Registers admin
 * - Assigns multiple badges to a test profile
 * - Exercises /communityPlatform/profiles/{profileId}/badges PATCH API with
 *   various filters and pagination
 * - Validates result data and meta, including empty-case and error conditions
 */
export async function test_api_profile_badges_listing_multiple_assignments_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
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

  // 2. Create a test profile id (simulate, since there's no create profile API in provided DTOs)
  const profileId = typia.random<string & tags.Format<"uuid">>();

  // 3. Assign >10 badges to ensure pagination (e.g., 12 for two pages at limit 10)
  const badgeTypes = ["gold", "silver", "bronze"] as const;
  const badgeNames = [
    "Founder",
    "MVP",
    "Contributor",
    "Veteran",
    "Champion",
  ] as const;
  const badges: ICommunityPlatformProfileBadge[] = await ArrayUtil.asyncRepeat(
    12,
    async (i) => {
      const type = RandomGenerator.pick(badgeTypes);
      const name = RandomGenerator.pick(badgeNames);
      const issuedAt = new Date(Date.now() - i * 86400 * 1000).toISOString(); // Each assigned on prior days
      const badge =
        await api.functional.communityPlatform.admin.profiles.badges.create(
          connection,
          {
            profileId: profileId,
            body: {
              community_platform_profile_id: profileId,
              badge_type: type,
              badge_name: name,
              issued_at: issuedAt,
              issuer: admin.email,
            } satisfies ICommunityPlatformProfileBadge.ICreate,
          },
        );
      typia.assert(badge);
      return badge;
    },
  );

  // 4. List all badges for profileId without filters (should get all, paginated)
  const pageLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const listedPage1 =
    await api.functional.communityPlatform.profiles.badges.index(connection, {
      profileId: profileId,
      body: {
        limit: pageLimit,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    });
  typia.assert(listedPage1);
  TestValidator.equals(
    "badge list page 1 count matches limit",
    listedPage1.data.length,
    pageLimit,
  );
  const listedPage2 =
    await api.functional.communityPlatform.profiles.badges.index(connection, {
      profileId: profileId,
      body: {
        limit: pageLimit,
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    });
  typia.assert(listedPage2);
  TestValidator.equals(
    "badge list page 2 count matches remainder",
    listedPage2.data.length,
    badges.length - pageLimit,
  );

  // 5. Filter by badge_type (pick random existing type)
  const filterType = badges[3].badge_type;
  const filteredTypeResult =
    await api.functional.communityPlatform.profiles.badges.index(connection, {
      profileId: profileId,
      body: {
        badge_type: filterType,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    });
  typia.assert(filteredTypeResult);
  TestValidator.predicate(
    "filtered badges all match type",
    filteredTypeResult.data.every((b) => b.badge_type === filterType),
  );

  // 6. Filter by badge_name
  const filterName = badges[2].badge_name;
  const filteredNameResult =
    await api.functional.communityPlatform.profiles.badges.index(connection, {
      profileId: profileId,
      body: {
        badge_name: filterName,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    });
  typia.assert(filteredNameResult);
  TestValidator.predicate(
    "filtered by name all match",
    filteredNameResult.data.every((b) => b.badge_name === filterName),
  );

  // 7. Edge case: List for a random (unassigned) profileId
  const emptyProfileId = typia.random<string & tags.Format<"uuid">>();
  const emptyListing =
    await api.functional.communityPlatform.profiles.badges.index(connection, {
      profileId: emptyProfileId,
      body: {
        limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    });
  typia.assert(emptyListing);
  TestValidator.equals(
    "empty listing for profile with no badges",
    emptyListing.data.length,
    0,
  );

  // 8. Confirm pagination meta correctness for non-empty and empty listings
  TestValidator.equals(
    "pagination meta for filled page",
    listedPage1.pagination.limit,
    pageLimit,
  );
  TestValidator.equals(
    "pagination meta for empty page",
    emptyListing.pagination.limit,
    5,
  );

  // 9. Validate badge contents in listing match assigned badges
  const allListedBadges = [...listedPage1.data, ...listedPage2.data];
  for (const assigned of badges) {
    const found = allListedBadges.find((item) => item.id === assigned.id);
    TestValidator.predicate(
      `assigned badge ${assigned.badge_name} appears in listing`,
      !!found,
    );
    if (found) {
      TestValidator.equals(
        "badge_type matches assigned",
        found.badge_type,
        assigned.badge_type,
      );
      TestValidator.equals(
        "badge_name matches assigned",
        found.badge_name,
        assigned.badge_name,
      );
      TestValidator.equals(
        "issuer matches assigned",
        found.issuer,
        assigned.issuer,
      );
      TestValidator.equals(
        "issued_at matches assigned",
        found.issued_at,
        assigned.issued_at,
      );
    }
  }

  // 10. Edge: Query with invalid/deleted profileId. (Business decision: for random UUID, should be empty or denied)
  // Can't simulate deleted, but random UUID gives empty result (covered in step 7).
}
