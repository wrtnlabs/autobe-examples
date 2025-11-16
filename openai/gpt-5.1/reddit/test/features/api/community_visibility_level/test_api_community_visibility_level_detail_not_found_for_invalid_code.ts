import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that member user visibility-level detail endpoint returns an error
 * when requesting a non-existent visibility level code, even when at least one
 * valid visibility level exists.
 *
 * Business context:
 *
 * - Community visibility levels are master configuration rows that control how
 *   communities are exposed/discoverable.
 * - Member users can fetch visibility level detail by code, but the system must
 *   distinguish between existing and non-existing codes.
 * - When a non-existent code is requested, the platform should respond with a
 *   not-found style error without leaking internal details.
 *
 * Steps:
 *
 * 1. Join as platformAdmin and obtain authenticated context.
 * 2. Create a valid community visibility level via the platformAdmin endpoint so
 *    that the table is non-empty.
 * 3. Join as memberUser and obtain authenticated context.
 * 4. Call the memberUser visibility-level detail endpoint with a code that is
 *    guaranteed not to exist.
 * 5. Assert that an error is thrown (representing not-found behavior).
 * 6. Optionally repeat with another invalid code to ensure stability.
 */
export async function test_api_community_visibility_level_detail_not_found_for_invalid_code(
  connection: api.IConnection,
) {
  // 1. Join as platformAdmin to prepare master data
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create at least one valid visibility level via platformAdmin
  const existingCode = `VIS_${RandomGenerator.alphaNumeric(12)}`;
  const visibilityCreateBody = {
    code: existingCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const createdVisibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(createdVisibilityLevel);
  TestValidator.equals(
    "created visibility level code should match request",
    createdVisibilityLevel.code,
    existingCode,
  );

  // 3. Join as memberUser and obtain authenticated context
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  // 4. Call detail endpoint with invalid visibility level codes
  const invalidCodes = [
    `NON_EXISTENT_VISIBILITY_CODE_${RandomGenerator.alphaNumeric(16)}`,
    `NON_EXISTENT_VISIBILITY_CODE_${RandomGenerator.alphaNumeric(16)}`,
  ];

  // Ensure invalid codes do not collide with the created code
  for (const invalidCode of invalidCodes) {
    TestValidator.notEquals(
      "invalid visibility code must differ from existing code",
      invalidCode,
      existingCode,
    );
  }

  // 5 & 6. Assert that each invalid code call results in an error
  for (const invalidCode of invalidCodes) {
    await TestValidator.error(
      `member user requesting non-existent visibility level code '${invalidCode}' should fail`,
      async () => {
        await api.functional.communityPlatform.memberUser.communityVisibilityLevels.at(
          connection,
          {
            visibilityLevelCode: invalidCode,
          },
        );
      },
    );
  }
}
