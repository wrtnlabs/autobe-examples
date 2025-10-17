import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserProfile";

/**
 * Authentication boundary: self-profile update requires a logged-in user.
 *
 * This test verifies that PUT /econDiscuss/member/me/profile rejects
 * unauthenticated requests. We send a valid update payload using an
 * unauthenticated connection (empty headers object) and assert that the call
 * fails. Per policy, we do not assert specific status codes, nor do we inspect
 * error payloads.
 *
 * Steps:
 *
 * 1. Build an unauthenticated connection by cloning the provided connection with
 *    headers: {} (no further header manipulation afterward).
 * 2. Prepare a valid IEconDiscussUserProfile.IUpdate payload.
 * 3. Call the update endpoint and assert that an error is thrown using
 *    TestValidator.error with async callback.
 */
export async function test_api_user_profile_update_requires_auth(
  connection: api.IConnection,
) {
  // 1) Create an unauthenticated connection (do not touch headers afterward)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Build a valid update payload (all fields optional, but must be valid when provided)
  const updateBody = {
    displayName: RandomGenerator.name(1),
    avatarUri: typia.random<string & tags.Format<"uri">>(),
    timezone: "Asia/Seoul",
    locale: "en-US",
    bio: RandomGenerator.paragraph({ sentences: 8 }),
    affiliation: RandomGenerator.paragraph({ sentences: 3 }),
    website: typia.random<string & tags.Format<"uri">>(),
    location: "Seoul, KR",
  } satisfies IEconDiscussUserProfile.IUpdate;

  // 3) Expect failure for unauthenticated request (no status code assertion)
  await TestValidator.error(
    "unauthenticated profile update should be rejected",
    async () => {
      await api.functional.econDiscuss.member.me.profile.update(unauthConn, {
        body: updateBody,
      });
    },
  );
}
