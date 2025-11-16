import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityVisibilityLevel";

/**
 * Validate pagination boundaries and metadata for community visibility levels
 * listing as a member user.
 *
 * Business goal
 *
 * - Ensure that when a member user lists community visibility levels through
 *   PATCH /communityPlatform/memberUser/communityVisibilityLevels, the
 *   pagination metadata and record slices are consistent and stable across
 *   multiple pages.
 * - Confirm that the server correctly reports total records and pages and that
 *   requesting pages sequentially yields a full coverage of created visibility
 *   levels without duplication or omission, given a fixed page size.
 *
 * End-to-end scenario
 *
 * 1. Register and authenticate a platformAdmin actor (join is enough because the
 *    join response already issues tokens and sets Authorization header in the
 *    SDK connection).
 * 2. Under the platformAdmin context, create 15 community visibility level records
 *    via POST /communityPlatform/platformAdmin/communityVisibilityLevels using
 *    ICommunityPlatformCommunityVisibilityLevel.ICreate. Generate distinct
 *    `code` and `name` values so ordering and uniqueness can be inspected.
 * 3. Register and authenticate a memberUser actor via POST /auth/memberUser/join.
 *    The SDK will automatically switch the Authorization header to this member
 *    user.
 * 4. As the memberUser, call PATCH
 *    /communityPlatform/memberUser/communityVisibilityLevels three times with
 *    body ICommunityPlatformCommunityVisibilityLevel.IRequest:
 *
 *    - First call: page=1, limit=5
 *    - Second call: page=2, limit=5
 *    - Third call: page=3, limit=5
 * 5. For each response (IPageICommunityPlatformCommunityVisibilityLevel.ISummary):
 *
 *    - Typia.assert(response) to validate type.
 *    - Assert pagination.limit === 5.
 *    - Assert pagination.records === 15 and is consistent across pages.
 *    - Assert pagination.pages === 3.
 *    - Assert pagination.current equals the requested page index for pages 1–3.
 *    - Assert data.length === 5 for pages 1, 2, and 3.
 * 6. Concatenate the data arrays from pages 1–3 and verify that:
 *
 *    - Total concatenated length is 15.
 *    - All IDs are unique (no duplicates), ensuring stable coverage without omission
 *         or duplication.
 *
 * Key points
 *
 * - Use only the DTOs provided
 *   (ICommunityPlatformCommunityVisibilityLevel.ICreate, .IRequest,
 *   IPageICommunityPlatformCommunityVisibilityLevel.ISummary, etc.).
 * - Rely on the SDK’s automatic token handling for actor switching, never
 *   touching connection.headers directly.
 * - Focus on verifying pagination metadata correctness and that the data slices
 *   align with those metadata values.
 */
export async function test_api_community_visibility_levels_pagination_boundaries_for_member_user(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join automatically authenticates as platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create 15 visibility level records as platformAdmin
  const totalLevels = 15;
  const createdLevels: ICommunityPlatformCommunityVisibilityLevel[] = [];

  for (let index = 0; index < totalLevels; index++) {
    const suffix = index + 1;
    const createBody = {
      code: `code-${suffix.toString().padStart(2, "0")}`,
      name: `Visibility Level ${suffix.toString().padStart(2, "0")}`,
      description: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

    const created =
      await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
        connection,
        { body: createBody },
      );
    typia.assert(created);
    createdLevels.push(created);
  }

  TestValidator.equals(
    "created visibility levels count should be 15",
    createdLevels.length,
    totalLevels,
  );

  // 3. Register member user (join authenticates and sets Authorization header)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Helper to fetch a page as member user
  const limit = 5;
  const fetchPage = async (page: number) => {
    const body = {
      page,
      limit,
    } satisfies ICommunityPlatformCommunityVisibilityLevel.IRequest;

    const pageResult: IPageICommunityPlatformCommunityVisibilityLevel.ISummary =
      await api.functional.communityPlatform.memberUser.communityVisibilityLevels.index(
        connection,
        { body },
      );
    typia.assert(pageResult);
    return pageResult;
  };

  // 5. Fetch pages 1, 2, 3
  const page1 = await fetchPage(1);
  const page2 = await fetchPage(2);
  const page3 = await fetchPage(3);

  const pages = [page1, page2, page3];

  // Common assertions for pages 1-3
  for (let i = 0; i < pages.length; i++) {
    const pageIndex = i + 1;
    const result = pages[i];
    const p = result.pagination;

    TestValidator.equals(
      `page ${pageIndex} pagination.limit should equal requested limit`,
      p.limit,
      limit,
    );
    TestValidator.equals(
      `page ${pageIndex} pagination.records should equal totalLevels`,
      p.records,
      totalLevels,
    );
    TestValidator.equals(
      `page ${pageIndex} pagination.pages should equal 3`,
      p.pages,
      3,
    );
    TestValidator.equals(
      `page ${pageIndex} pagination.current should equal requested page`,
      p.current,
      pageIndex,
    );
    TestValidator.equals(
      `page ${pageIndex} data length should equal limit`,
      result.data.length,
      limit,
    );
  }

  // 6. Concatenate data from pages 1-3 and verify uniqueness and coverage
  const concatenated = [...page1.data, ...page2.data, ...page3.data];

  TestValidator.equals(
    "concatenated data length across pages 1-3 should equal totalLevels",
    concatenated.length,
    totalLevels,
  );

  const idSet = new Set<string>();
  for (const item of concatenated) {
    idSet.add(item.id);
  }

  TestValidator.equals(
    "all visibility level IDs across pages should be unique",
    idSet.size,
    concatenated.length,
  );
}
