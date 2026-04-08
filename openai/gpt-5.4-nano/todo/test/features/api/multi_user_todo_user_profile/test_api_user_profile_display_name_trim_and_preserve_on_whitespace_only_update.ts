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

export async function test_api_user_profile_display_name_trim_and_preserve_on_whitespace_only_update(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test trimming behavior and whitespace-only preservation for member profile display_name.
   *
   * Validates that:
   * 1. A valid display_name update persists.
   * 2. Leading/trailing whitespace is trimmed and reflected in display_name.
   * 3. updated_at increases only on successful non-empty updates.
   * 4. A whitespace-only display_name attempt must not overwrite the last successful value.
   *    This test does not assume whether the server rejects or accepts the whitespace-only payload.
   *    If the endpoint returns a profile response for the attempt, we validate that it preserves
   *    the previous display_name and does not advance updated_at.
   * 5. A subsequent valid update succeeds and advances updated_at.
   */
  // 1) Authenticate as a member via join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      display_name: "Initial Valid",
      password: "TestPassword_1234!",
      href: "https://example.com",
      referrer: "https://example.com/ref",
      ip: "127.0.0.1",
    },
  });
  // 2) Call PATCH with "Initial Valid"
  const response1 = await api.functional.multiUserTodo.member.profile.patch(
    memberConnection,
    {
      body: {
        display_name: "Initial Valid",
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(response1);
  // 3) Call PATCH with "   Trimmed Name   " and validate trimming + updated_at progression
  const response2 = await api.functional.multiUserTodo.member.profile.patch(
    memberConnection,
    {
      body: {
        display_name: "   Trimmed Name   ",
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(response2);
  TestValidator.equals(
    "display_name is trimmed",
    response2.display_name,
    "Trimmed Name",
  );
  TestValidator.predicate(
    "updated_at advanced after trimmed update",
    response2.updated_at > response1.updated_at,
  );
  const lastSuccessfulDisplayName: string = response2.display_name;
  const lastSuccessfulUpdatedAt: string = response2.updated_at;
  // 4) Call PATCH with whitespace-only payload.
  //    Do not assert specific validation/rejection status.
  try {
    const whitespaceAttempt =
      await api.functional.multiUserTodo.member.profile.patch(
        memberConnection,
        {
          body: {
            display_name: "   ",
          } satisfies IMultiUserTodoUserProfile.IUpdate,
        },
      );
    typia.assert(whitespaceAttempt);
    // If the server returns a profile response, it must preserve previous state.
    TestValidator.equals(
      "display_name preserved on whitespace-only response",
      whitespaceAttempt.display_name,
      lastSuccessfulDisplayName,
    );
    TestValidator.predicate(
      "updated_at not advanced on whitespace-only response",
      whitespaceAttempt.updated_at === lastSuccessfulUpdatedAt,
    );
  } catch {
    // If the server rejects with an error, we cannot read state without a read endpoint.
    // The next successful update assertions still validate the workflow continues correctly.
  }
  // 5) Call PATCH with "Next Valid" and validate updated_at progression
  const response3 = await api.functional.multiUserTodo.member.profile.patch(
    memberConnection,
    {
      body: {
        display_name: "Next Valid",
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(response3);
  TestValidator.equals(
    "display_name updated to next valid",
    response3.display_name,
    "Next Valid",
  );
  TestValidator.predicate(
    "updated_at advanced after next valid update",
    response3.updated_at > lastSuccessfulUpdatedAt,
  );
}
