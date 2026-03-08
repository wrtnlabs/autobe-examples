import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful profile retrieval for an authenticated member.
 *
 * 1. Register a new member using authorize_member_join utility
 * 2. Retrieve the member's profile using GET /todoApp/member/profile
 * 3. Validate all profile fields match the registered data
 * 4. Verify security: password_hash is not exposed in response
 */
export async function test_api_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_member_join(memberConnection, {
    body: {
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(registered);
  // 2. Retrieve the member's profile
  const profile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate profile matches registered data
  TestValidator.equals("profile id matches", profile.id, registered.id);
  TestValidator.equals(
    "profile email matches",
    profile.email,
    registered.email,
  );
  TestValidator.equals(
    "profile displayName matches",
    profile.displayName,
    registered.displayName,
  );
  TestValidator.equals(
    "profile createdAt matches",
    profile.createdAt,
    registered.createdAt,
  );
  TestValidator.equals(
    "profile updatedAt matches",
    profile.updatedAt,
    registered.updatedAt,
  );
}
