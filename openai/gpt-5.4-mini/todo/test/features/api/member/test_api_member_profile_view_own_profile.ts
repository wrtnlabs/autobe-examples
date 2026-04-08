import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_view_own_profile(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieval of the authenticated member's own private profile.
   *
   * Verifies that a newly created member can access only their own profile
   * record through the private profile endpoint. The response is expected to
   * include the profile display name and lifecycle fields, while keeping the
   * embedded member summary scoped to the authenticated account.
   *
   * This scenario covers the private account boundary by creating a fresh
   * member session through sign-up, then calling the profile endpoint with an
   * isolated authenticated connection. It ensures no credential data or other
   * users' profile information is exposed in the response, and that the
   * returned profile remains a caller-owned record.
   *
   * 1. Create a unique member account through the join endpoint.
   * 2. Call the private profile endpoint using the authenticated session.
   * 3. Validate the returned profile belongs to the caller and preserves
   *    lifecycle metadata.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "1234";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  const profileConnection: api.IConnection = { host: connection.host };
  profileConnection.headers = {
    Authorization: authorized.token.access,
  };
  const profile =
    await api.functional.todoApp.member.profile.at(profileConnection);
  typia.assert(profile);
  TestValidator.equals(
    "profile should belong to the authenticated member account",
    profile.member,
    authorized,
  );
  TestValidator.equals(
    "profile should expose the caller's private display name",
    profile.display_name,
    authorized.profile.display_name,
  );
  TestValidator.equals(
    "profile created_at should match the authenticated profile snapshot",
    profile.created_at,
    authorized.profile.created_at,
  );
  TestValidator.equals(
    "profile updated_at should match the authenticated profile snapshot",
    profile.updated_at,
    authorized.profile.updated_at,
  );
  TestValidator.equals(
    "profile deleted_at should be null for an active member profile",
    profile.deleted_at,
    authorized.profile.deleted_at,
  );
}
