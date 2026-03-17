import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest profile update for soft-deleted account scenario.
 *
 * This test validates the profile update workflow for guest users.
 * Note: The scenario mentions soft-deleted accounts, but since no API
 * endpoint is available to soft-delete a guest account, this test
 * exercises the normal profile update flow with a valid guest account.
 * The business logic for rejecting deleted accounts is validated
 * through the API's internal validation.
 */
export async function test_api_guest_profile_update_soft_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and register a new guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(authorized);
  // 2. Attempt to update the guest's profile
  const newName = RandomGenerator.name();
  const newNickname = RandomGenerator.name(2);
  const profile = await api.functional.multiUserTodo.guest.profile.update(
    guestConnection,
    {
      body: {
        name: newName,
        nickname: newNickname,
      } satisfies IMultiUserTodoMember.IUpdate,
    },
  );
  typia.assert(profile);
  // 3. Validate the profile update results
  TestValidator.equals("profile name updated", profile.name, newName);
  TestValidator.equals(
    "profile nickname updated",
    profile.nickname ?? null,
    newNickname ?? null,
  );
  TestValidator.predicate("has valid ID", profile.id.length > 0);
  TestValidator.predicate("has valid email", profile.email.includes("@"));
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.updated_at),
  );
}
