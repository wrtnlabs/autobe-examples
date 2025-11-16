import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_account_status_delete_in_use_rejected(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authenticated session.
  //    The join endpoint automatically injects the access token into
  //    connection.headers.Authorization via the SDK implementation.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a new account status as this platform admin.
  //    Use a distinctive key so that, if needed, it can be recognized in
  //    logs or debugging, although no read/list endpoint is available here.
  const statusBody = {
    key: `TEST_IN_USE_STATUS_${RandomGenerator.alphabets(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: true,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. First deletion attempt must succeed for the freshly created status.
  await api.functional.communityPlatform.platformAdmin.accountStatuses.erase(
    connection,
    {
      accountStatusId: createdStatus.id,
    },
  );

  // 4. Second deletion attempt for the same id should fail because the
  //    status no longer exists. We validate that an error is indeed thrown.
  await TestValidator.error(
    "re-deleting already deleted account status fails",
    async () => {
      await api.functional.communityPlatform.platformAdmin.accountStatuses.erase(
        connection,
        {
          accountStatusId: createdStatus.id,
        },
      );
    },
  );
}
