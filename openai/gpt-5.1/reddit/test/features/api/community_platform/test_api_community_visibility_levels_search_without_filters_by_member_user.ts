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
 * Validate default search of community visibility levels for an authenticated
 * member user when no pagination or filter parameters are provided.
 *
 * Business goals:
 *
 * - Member users can always discover configured visibility levels without needing
 *   to specify paging or filters.
 * - Server must apply reasonable defaults for page and limit when the request
 *   body is empty.
 * - Listing is stable (same paging and ordering) across repeated calls when
 *   underlying data does not change.
 */
export async function test_api_community_visibility_levels_search_without_filters_by_member_user(
  connection: api.IConnection,
) {
  // 1. Join as platform admin so we can create visibility level master data
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create multiple visibility levels as platform admin
  const baseCode = RandomGenerator.alphaNumeric(8);
  const visibleLevels: ICommunityPlatformCommunityVisibilityLevel[] = [];

  const levelCount = 3;
  for (let i = 0; i < levelCount; i++) {
    const createBody = {
      code: `${baseCode}_${i}`,
      name: `Visibility ${i}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

    const created: ICommunityPlatformCommunityVisibilityLevel =
      await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
        connection,
        { body: createBody },
      );
    typia.assert(created);
    visibleLevels.push(created);
  }

  // 3. Join as member user (connection Authorization becomes memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 4. First search call with empty IRequest body to use defaults
  const requestBody1 =
    {} satisfies ICommunityPlatformCommunityVisibilityLevel.IRequest;

  const page1: IPageICommunityPlatformCommunityVisibilityLevel.ISummary =
    await api.functional.communityPlatform.memberUser.communityVisibilityLevels.index(
      connection,
      { body: requestBody1 },
    );
  typia.assert(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  // Pagination current should be default first page (1)
  TestValidator.equals(
    "default current page should be 1",
    pagination1.current,
    1 as number,
  );

  // Limit should be positive
  TestValidator.predicate(
    "default pagination limit should be positive",
    pagination1.limit > 0,
  );

  // Total records should be at least number of levels we inserted
  TestValidator.predicate(
    "pagination.records should be >= number of created visibility levels",
    pagination1.records >= visibleLevels.length,
  );

  // Data must be non-empty and not exceed limit
  TestValidator.predicate("data array should be non-empty", data1.length > 0);
  TestValidator.predicate(
    "data length should not exceed pagination.limit",
    data1.length <= pagination1.limit,
  );

  // Each summary must have non-empty id, code, and name
  for (const item of data1) {
    typia.assert<ICommunityPlatformCommunityVisibilityLevel.ISummary>(item);

    TestValidator.predicate(
      "visibility level summary id must be non-empty string",
      typeof item.id === "string" && item.id.length > 0,
    );
    TestValidator.predicate(
      "visibility level summary code must be non-empty string",
      typeof item.code === "string" && item.code.length > 0,
    );
    TestValidator.predicate(
      "visibility level summary name must be non-empty string",
      typeof item.name === "string" && item.name.length > 0,
    );
  }

  // 5. Second search call with same empty body to ensure stability
  const requestBody2 =
    {} satisfies ICommunityPlatformCommunityVisibilityLevel.IRequest;

  const page2: IPageICommunityPlatformCommunityVisibilityLevel.ISummary =
    await api.functional.communityPlatform.memberUser.communityVisibilityLevels.index(
      connection,
      { body: requestBody2 },
    );
  typia.assert(page2);

  const pagination2 = page2.pagination;
  const data2 = page2.data;

  // Pagination defaults should be identical
  TestValidator.equals(
    "repeated call should keep same current page",
    pagination2.current,
    pagination1.current,
  );
  TestValidator.equals(
    "repeated call should keep same limit",
    pagination2.limit,
    pagination1.limit,
  );

  // Data ordering should be stable when no new records inserted between calls
  TestValidator.equals(
    "repeated call should return same data ordering when no changes occur",
    data2,
    data1,
  );
}
