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

export async function test_api_member_profile_display_name_update_persists_and_stays_non_empty(
  connection: api.IConnection,
): Promise<void> {
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null as null,
  } satisfies ITodoAppMember.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = authorized.token.access;
  const displayNameA = RandomGenerator.name(2);
  TestValidator.predicate(
    "display_name A is non-empty",
    displayNameA.trim().length > 0,
  );
  const updatedA = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: displayNameA,
      } satisfies ITodoAppUserProfile.IUpdate,
    },
  );
  typia.assert(updatedA);
  TestValidator.equals(
    "display_name A persisted",
    updatedA.display_name,
    displayNameA,
  );
  TestValidator.predicate(
    "display_name A in response is non-empty",
    updatedA.display_name.trim().length > 0,
  );
  const updatedAtA = updatedA.updated_at;
  const displayNameB = RandomGenerator.name(3);
  TestValidator.predicate(
    "display_name B is non-empty",
    displayNameB.trim().length > 0,
  );
  const updatedB = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: displayNameB,
      } satisfies ITodoAppUserProfile.IUpdate,
    },
  );
  typia.assert(updatedB);
  TestValidator.equals(
    "display_name B persisted",
    updatedB.display_name,
    displayNameB,
  );
  TestValidator.predicate(
    "display_name B in response is non-empty",
    updatedB.display_name.trim().length > 0,
  );
  TestValidator.notEquals(
    "updated_at should change after second update",
    updatedAtA,
    updatedB.updated_at,
  );
  TestValidator.predicate(
    "updated_at should be monotonic increase",
    new Date(updatedB.updated_at).getTime() > new Date(updatedAtA).getTime(),
  );
}
