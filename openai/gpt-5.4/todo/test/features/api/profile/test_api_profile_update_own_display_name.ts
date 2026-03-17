import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_own_display_name(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const newDisplayName = `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`;
  const body = {
    displayName: newDisplayName,
  } satisfies ITodoAppProfile.IUpdate;
  const updated = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "display name updated",
    updated.displayName,
    newDisplayName,
  );
  TestValidator.equals("member id preserved", updated.member.id, authorized.id);
  TestValidator.equals(
    "member email preserved",
    updated.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member email verification preserved",
    updated.member.email_verified,
    authorized.email_verified,
  );
  TestValidator.equals(
    "member created_at preserved",
    updated.member.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "member updated_at preserved",
    updated.member.updated_at,
    authorized.updated_at,
  );
  TestValidator.equals(
    "member deleted_at preserved",
    updated.member.deleted_at,
    authorized.deleted_at,
  );
  TestValidator.predicate(
    "profile updated_at is not earlier than created_at",
    new Date(updated.updated_at).getTime() >=
      new Date(updated.created_at).getTime(),
  );
}
