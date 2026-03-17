import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_read_authenticated_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register a new member and authenticate (sets Authorization header on memberConnection)
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 3. Retrieve the authenticated member's profile using the authenticated connection
  const profile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  // 4. Validate business logic: memberId must match the registered member's id
  TestValidator.equals(
    "profile memberId matches member id",
    profile.memberId,
    authorized.id,
  );
  // 5. Validate profile id matches the profile returned at registration
  TestValidator.equals(
    "profile id matches registration profile id",
    profile.id,
    authorized.profile.id,
  );
  // 6. displayName must be a non-empty string
  TestValidator.predicate(
    "displayName is non-empty",
    profile.displayName.length > 0,
  );
  // 7. updatedAt must be equal to or later than createdAt
  TestValidator.predicate(
    "updatedAt is equal to or later than createdAt",
    new Date(profile.updatedAt) >= new Date(profile.createdAt),
  );
}
