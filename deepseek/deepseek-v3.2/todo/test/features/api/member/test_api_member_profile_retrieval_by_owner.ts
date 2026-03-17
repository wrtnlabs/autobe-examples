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

export async function test_api_member_profile_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorizedMember);
  // 2. Retrieve the member's own profile using their ID
  const profile = await api.functional.todoApp.members.at(memberConnection, {
    memberId: authorizedMember.id,
  });
  typia.assert(profile);
  // 3. Validate that all fields match the registration data
  TestValidator.equals("member ID matches", profile.id, authorizedMember.id);
  TestValidator.equals(
    "email matches registration",
    profile.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "display name matches registration",
    profile.display_name,
    authorizedMember.display_name,
  );
  // 4. Validate timestamp formats and business logic
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(profile.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(profile.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
  // 5. Validate timestamps are reasonable (created_at <= updated_at)
  const createdAt = new Date(profile.created_at);
  const updatedAt = new Date(profile.updated_at);
  TestValidator.predicate(
    "created_at is not after updated_at",
    () => createdAt <= updatedAt,
  );
}
