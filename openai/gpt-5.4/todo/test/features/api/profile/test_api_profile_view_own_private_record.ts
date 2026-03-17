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

export async function test_api_profile_view_own_private_record(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies Partial<ITodoAppMember.IJoin>,
  });
  typia.assert(joined);
  const profile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  TestValidator.equals(
    "profile belongs to signed-in member id",
    profile.member.id,
    joined.id,
  );
  TestValidator.equals(
    "profile member email matches authorized member",
    profile.member.email,
    joined.email,
  );
  TestValidator.equals(
    "profile member email verification matches authorized member",
    profile.member.email_verified,
    joined.email_verified,
  );
  TestValidator.equals(
    "profile member created timestamp matches authorized member",
    profile.member.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "profile member updated timestamp matches authorized member",
    profile.member.updated_at,
    joined.updated_at,
  );
  TestValidator.equals(
    "profile member deleted timestamp matches authorized member",
    profile.member.deleted_at,
    joined.deleted_at,
  );
  TestValidator.predicate(
    "profile display name is non-empty",
    profile.displayName.trim().length > 0,
  );
  TestValidator.notEquals("profile id exists", profile.id, "");
}
