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

export async function test_api_member_profile_retrieval_after_authentication(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: joinInput },
  );
  typia.assert(authorized);
  // 2. Retrieve member profile
  const profile: ITodoAppMember =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate profile fields match registration data
  TestValidator.equals(
    "email matches registration",
    profile.email,
    joinInput.email,
  );
  TestValidator.equals(
    "display_name matches registration",
    profile.display_name,
    joinInput.displayName,
  );
  TestValidator.equals(
    "id matches authorized response",
    profile.id,
    authorized.id,
  );
  TestValidator.equals(
    "created_at matches authorized response",
    profile.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "updated_at matches authorized response",
    profile.updated_at,
    authorized.updated_at,
  );
  // 4. Validate deleted_at is null (active account)
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}
