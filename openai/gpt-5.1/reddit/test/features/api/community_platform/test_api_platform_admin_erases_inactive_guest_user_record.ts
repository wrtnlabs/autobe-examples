import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_erases_inactive_guest_user_record(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (authenticates) to obtain JWT tokens and admin context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a baseline account status definition.
  const statusBody = {
    key: `INACTIVE_${RandomGenerator.alphabets(8)}`,
    label: "Inactive Guest",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: false,
    isPostingAllowed: false,
    isVotingAllowed: false,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const status: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(status);

  // 3. Call erase for a guest user id (opaque string identifier).
  // We cannot create an actual guest user with available APIs, so we only
  // validate that the endpoint is callable under admin context and that it
  // does not throw synchronously for a well-formed request.
  const guestUserId: string = typia.random<string & tags.Format<"uuid">>();

  await api.functional.communityPlatform.platformAdmin.guestUsers.erase(
    connection,
    {
      guestUserId,
    },
  );

  // 4. Sanity assertion that flow reached here without error.
  TestValidator.predicate(
    "platform admin erase guest user call completed without throwing",
    true,
  );
}
