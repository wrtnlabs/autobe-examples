import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profile_display_name_update_consistent_when_one_update_invalid(
  connection: api.IConnection,
): Promise<void> {
  /**
     * Test concurrent display name updates where one request is invalid after trimming.
     
     * Validates that a whitespace-only display_name update is rejected and that
     * the concurrently submitted valid display_name update persists as the final
     * profile state without being overwritten by the invalid attempt.
     
     * 1. Join as an authenticated member.
     * 2. Read baseline display_name.
     * 3. Send two concurrent profile update requests:
     *    - One with a non-empty display_name (after trimming).
     *    - One with whitespace-only display_name (becomes empty after trimming).
     * 4. Validate that only the valid update is accepted.
     * 5. Read the profile again and assert the final display_name equals the
     *    trimmed valid payload and differs from baseline.
     */
  // 1. Member join / authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const password = typia.random<
    string & tags.MinLength<1> & tags.Format<"password">
  >();
  const initialDisplayName = typia.random<string & tags.MinLength<1>>();
  await authorize_member_join(memberConnection, {
    body: {
      display_name: initialDisplayName,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Capture baseline profile
  const baseline =
    await api.functional.multiUserTodo.member.profile.at(memberConnection);
  typia.assert(baseline);
  // 3. Prepare concurrent update payloads
  const payloadValidRaw = `   ${RandomGenerator.name(2)}   `;
  const payloadValidTrimmed = payloadValidRaw.trim();
  TestValidator.predicate(
    "payload_valid trimmed display_name should be non-empty",
    payloadValidTrimmed.length > 0,
  );
  const payloadInvalidWhitespaceOnly = "     ";
  TestValidator.equals(
    "invalid payload should become empty after trim",
    payloadInvalidWhitespaceOnly.trim(),
    "",
  );
  // 4-5. Submit concurrently and validate outcomes
  const validPromise =
    api.functional.multiUserTodo.member.profiles.updateProfile(
      memberConnection,
      {
        body: {
          display_name: payloadValidRaw,
        } satisfies IMultiUserTodoUserProfile.IUpdate,
      },
    );
  await Promise.all([
    TestValidator.error("invalid update should be rejected", async () => {
      await api.functional.multiUserTodo.member.profiles.updateProfile(
        memberConnection,
        {
          body: {
            display_name: payloadInvalidWhitespaceOnly,
          } satisfies IMultiUserTodoUserProfile.IUpdate,
        },
      );
    }),
    (async () => {
      const updated = await validPromise;
      typia.assert(updated);
    })(),
  ]);
  // 6. Final profile read
  const finalProfile =
    await api.functional.multiUserTodo.member.profile.at(memberConnection);
  typia.assert(finalProfile);
  // 7. Final assertions
  TestValidator.equals(
    "final display_name equals trimmed valid payload",
    finalProfile.display_name,
    payloadValidTrimmed,
  );
  TestValidator.notEquals(
    "final display_name differs from baseline",
    finalProfile.display_name,
    baseline.display_name,
  );
}
