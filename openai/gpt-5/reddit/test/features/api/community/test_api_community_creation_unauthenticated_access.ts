import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Verify unauthenticated community creation is rejected.
 *
 * Business context: Creating a community requires an authenticated member user.
 * This test builds a valid creation payload but sends it with an
 * unauthenticated connection to ensure the backend rejects the request.
 *
 * Steps:
 *
 * 1. Prepare a valid ICommunityPlatformCommunity.ICreate payload.
 * 2. Create an unauthenticated connection by cloning the incoming connection and
 *    setting headers to an empty object (the only allowed pattern).
 * 3. Call POST /communityPlatform/memberUser/communities with the unauthenticated
 *    connection and expect an error via TestValidator.error.
 * 4. Do not assert status codes or error messages; simply verify that an error
 *    occurs. Authenticated success path is covered by other tests.
 */
export async function test_api_community_creation_unauthenticated_access(
  connection: api.IConnection,
) {
  // 1) Prepare a valid creation payload
  const createBody = {
    name: `c_${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public",
    nsfw: false,
    auto_archive_days: 30,
    language: "en",
    region: "KR",
  } satisfies ICommunityPlatformCommunity.ICreate;

  // 2) Construct an unauthenticated connection (ONLY allowed pattern)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Expect the unauthenticated request to fail
  await TestValidator.error(
    "unauthenticated community creation must be rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.create(
        unauthConn,
        { body: createBody },
      );
    },
  );
}
