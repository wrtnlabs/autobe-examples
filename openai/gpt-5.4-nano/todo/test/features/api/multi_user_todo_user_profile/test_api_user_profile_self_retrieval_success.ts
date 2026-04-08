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

export async function test_api_user_profile_self_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test self-only retrieval of an authenticated member’s private profile.
   *
   * Validates that an authenticated member can retrieve their own profile via
   * GET /multiUserTodo/member/profile and that the operation is stable across
   * repeated reads.
   *
   * Business invariants validated:
   * 1. Self-only access boundary (profile returned matches the authenticated
   *    subject identifiers).
   * 2. Core fields are present: profile id, display_name, and timestamps.
   * 3. Read consistency: repeated reads do not change id/display_name/created_at
   *    and do not unexpectedly update updated_at.
   *
   * 1. Member joins to obtain an authenticated context.
   * 2. Member retrieves profile.
   * 3. Member retrieves profile again and validates consistency.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  const profile1 =
    await api.functional.multiUserTodo.member.profile.at(memberConnection);
  typia.assert(profile1);
  TestValidator.equals(
    "profile id matches authenticated context",
    profile1.id,
    credentials.id,
  );
  TestValidator.equals(
    "profile owner matches authenticated context",
    profile1.multi_user_todo_user_id,
    credentials.multi_user_todo_user_id,
  );
  TestValidator.predicate(
    "display_name is non-empty",
    profile1.display_name.length > 0,
  );
  TestValidator.predicate(
    "created_at is present",
    profile1.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    profile1.updated_at.length > 0,
  );
  const profile2 =
    await api.functional.multiUserTodo.member.profile.at(memberConnection);
  typia.assert(profile2);
  TestValidator.equals(
    "profile id stable across reads",
    profile2.id,
    profile1.id,
  );
  TestValidator.equals(
    "display name stable across reads",
    profile2.display_name,
    profile1.display_name,
  );
  TestValidator.equals(
    "created_at stable across reads",
    profile2.created_at,
    profile1.created_at,
  );
  TestValidator.equals(
    "updated_at does not change for read-only retrieval",
    profile2.updated_at,
    profile1.updated_at,
  );
  TestValidator.equals(
    "owner id stable across reads",
    profile2.multi_user_todo_user_id,
    profile1.multi_user_todo_user_id,
  );
}
