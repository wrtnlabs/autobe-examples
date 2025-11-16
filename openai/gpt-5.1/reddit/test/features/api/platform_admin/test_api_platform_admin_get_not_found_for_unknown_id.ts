import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_get_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin so that subsequent calls run with platformAdmin privileges.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorizedAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create at least one account status to keep environment realistic.
  const statusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusBody,
      },
    );
  typia.assert(createdStatus);

  // 3. Generate a random UUID that is extremely unlikely to match any existing platform admin id.
  const unknownPlatformAdminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Call GET-by-id with the unknown UUID and assert that an error occurs (not-found style),
  // without validating specific HTTP status codes or error message contents.
  await TestValidator.error(
    "get platformAdmin by unknown id should throw error",
    async () => {
      await api.functional.communityPlatform.platformAdmin.platformAdmins.at(
        connection,
        {
          platformAdminId: unknownPlatformAdminId,
        },
      );
    },
  );
}
