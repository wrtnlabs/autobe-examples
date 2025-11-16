import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_visibility_level_detail_by_code_for_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new member user (self-registration) and capture credentials.
  const memberUsername = RandomGenerator.name(1);
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register a platform administrator and obtain admin authentication.
  const adminUsername = RandomGenerator.name(1);
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const platformAdminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    href: adminHref,
    referrer: adminReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 3. As platformAdmin, create a new community visibility level with a unique code.
  const visibilityCode = `PUBLIC_DETAIL_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });
  const visibilityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 12,
  });

  const createVisibilityBody = {
    code: visibilityCode,
    name: visibilityName,
    description: visibilityDescription,
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const createdVisibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: createVisibilityBody,
      },
    );
  typia.assert(createdVisibility);

  TestValidator.equals(
    "created visibility level code matches request body",
    createdVisibility.code,
    visibilityCode,
  );
  TestValidator.equals(
    "created visibility level name matches request body",
    createdVisibility.name,
    visibilityName,
  );
  TestValidator.equals(
    "created visibility level description matches request body",
    createdVisibility.description,
    visibilityDescription,
  );

  // 4. Switch authentication back to the member user via memberUser login.
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberReAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberReAuthorized);

  // 5. As memberUser, retrieve the visibility level detail by its business code.
  const firstRead: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.memberUser.communityVisibilityLevels.at(
      connection,
      {
        visibilityLevelCode: visibilityCode,
      },
    );
  typia.assert(firstRead);

  // Validate key business fields and lifecycle timestamps.
  TestValidator.equals(
    "member user read - id matches created visibility level",
    firstRead.id,
    createdVisibility.id,
  );
  TestValidator.equals(
    "member user read - code matches requested visibility code",
    firstRead.code,
    visibilityCode,
  );
  TestValidator.equals(
    "member user read - name matches created visibility level",
    firstRead.name,
    visibilityName,
  );
  TestValidator.equals(
    "member user read - description matches created visibility level",
    firstRead.description,
    visibilityDescription,
  );

  // Ensure deleted_at represents an active record (null or undefined).
  TestValidator.predicate(
    "visibility level is not soft-deleted",
    firstRead.deleted_at === null || firstRead.deleted_at === undefined,
  );

  // Validate date-time format via typia.assert on the specific fields.
  const createdAt = typia.assert<string & tags.Format<"date-time">>(
    firstRead.created_at,
  );
  const updatedAt = typia.assert<string & tags.Format<"date-time">>(
    firstRead.updated_at,
  );

  TestValidator.predicate(
    "created_at should be a non-empty ISO date-time string",
    createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty ISO date-time string",
    updatedAt.length > 0,
  );

  // 6. Call the detail endpoint again to ensure repeatable, idempotent reads.
  const secondRead: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.memberUser.communityVisibilityLevels.at(
      connection,
      {
        visibilityLevelCode: visibilityCode,
      },
    );
  typia.assert(secondRead);

  // 7. Verify the second read is deeply equal to the first read.
  TestValidator.equals(
    "second read of visibility level matches the first read",
    secondRead,
    firstRead,
  );
}
