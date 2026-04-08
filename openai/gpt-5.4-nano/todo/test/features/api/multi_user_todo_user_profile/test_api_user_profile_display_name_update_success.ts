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

export async function test_api_user_profile_display_name_update_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated member can update their own profile display_name.
   *
   * Validates that PATCH /multiUserTodo/member/profile persists the new display name,
   * preserves profile ownership (multi_user_todo_user_id), and refreshes updated_at.
   * Additionally verifies business invariants by comparing server-managed fields
   * (id, multi_user_todo_user_id, deleted_at) between the authentication snapshot
   * and the PATCH result.
   *
   * 1. A member is registered/authenticated via POST /multiUserTodo/auth/member/join.
   * 2. The member calls PATCH /multiUserTodo/member/profile with display_name = "Alice Updated".
   * 3. The test asserts display_name, ownership, and updated_at monotonicity.
   * 4. The test asserts server-managed fields are unchanged by the update.
   */
  // 1) Authenticate as member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      display_name: "Alice",
      password: "Password123!" satisfies string & tags.Format<"password">,
      href: "https://example.com/auth" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  // Timestamp immediately before PATCH
  const beforePatchAt = new Date().toISOString();
  // 2) PATCH profile display name
  const updated = await api.functional.multiUserTodo.member.profile.patch(
    memberConnection,
    {
      body: {
        display_name: "Alice Updated",
      } satisfies IMultiUserTodoUserProfile.IUpdate,
    },
  );
  typia.assert(updated);
  // 3) Validate response
  TestValidator.equals(
    "display_name should be updated",
    updated.display_name,
    "Alice Updated",
  );
  TestValidator.equals(
    "multi_user_todo_user_id should be preserved (ownership unchanged)",
    updated.multi_user_todo_user_id,
    authorized.multi_user_todo_user_id,
  );
  TestValidator.predicate(
    "updated_at should be later than before PATCH call",
    updated.updated_at > beforePatchAt,
  );
  // 4) Business rule validation: only display_name and updated_at should change
  TestValidator.equals("id should be preserved", updated.id, authorized.id);
  TestValidator.equals(
    "deleted_at should be preserved",
    updated.deleted_at,
    authorized.deleted_at,
  );
}
