import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

export async function test_api_subscription_unauthenticated_request_rejected(
  connection: api.IConnection,
) {
  /**
   * Validate that unauthenticated subscription attempts are rejected.
   *
   * Steps:
   *
   * 1. Register a member user (join) to obtain an authenticated context.
   * 2. Create a community with that authenticated context to get a valid
   *    communityId.
   * 3. Clone the connection to an unauthenticated one (headers: {}) without
   *    touching the original.
   * 4. Call subscribe with the unauthenticated connection and expect an error.
   *
   * Notes:
   *
   * - Do not assert HTTP status codes; only assert that an error occurs.
   * - Request bodies strictly use `satisfies` with exact DTO variants.
   */
  // 1) Register a member user (authenticated context will be handled by SDK)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[A-Za-z0-9_]{3,20}$">
    >(),
    password: typia.random<
      string &
        tags.MinLength<8> &
        tags.MaxLength<64> &
        tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d\\S]{8,64}$">
    >(),
    terms_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    privacy_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    marketing_opt_in: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(authorized);

  // 2) Create a community (requires authenticated context)
  const communityCreateBody = {
    name: `c_${RandomGenerator.alphabets(8)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: typia.random<IECommunityVisibility>(),
    nsfw: RandomGenerator.pick([true, false] as const),
    auto_archive_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<30>
    >(),
    language: RandomGenerator.pick(["en", "ko", "ja", "zh"] as const),
    region: RandomGenerator.pick(["US", "KR", "JP", "CN"] as const),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3) Prepare unauthenticated connection (allowed pattern)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Attempt to subscribe without authentication and expect error
  await TestValidator.error(
    "unauthenticated subscription request is rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.subscribe.create(
        unauthConn,
        {
          communityId: community.id,
        },
      );
    },
  );
}
