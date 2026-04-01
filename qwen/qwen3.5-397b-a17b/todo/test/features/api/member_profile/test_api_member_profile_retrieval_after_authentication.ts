import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_retrieval_after_authentication(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration - creates authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Retrieve profile using the authenticated connection
  const profile =
    await api.functional.multiUserTodo.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate profile id matches the authenticated member id
  TestValidator.equals(
    "profile id matches member id",
    profile.id,
    joinResult.id,
  );
  // 4. Validate displayName is a non-empty string
  TestValidator.predicate(
    "displayName is non-empty",
    profile.displayName.length > 0,
  );
  // 5. Validate timestamps are valid ISO datetime strings
  TestValidator.predicate(
    "createdAt is valid date",
    !Number.isNaN(new Date(profile.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updatedAt is valid date",
    !Number.isNaN(new Date(profile.updatedAt).getTime()),
  );
  // 6. Validate deletedAt is null (active profile)
  TestValidator.equals(
    "deletedAt is null for active profile",
    profile.deletedAt,
    null,
  );
  // 7. Validate createdAt is not in the future
  TestValidator.predicate(
    "createdAt is not in future",
    new Date(profile.createdAt).getTime() <= Date.now(),
  );
}