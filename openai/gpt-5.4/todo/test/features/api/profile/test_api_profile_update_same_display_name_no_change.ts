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

export async function test_api_profile_update_same_display_name_no_change(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const displayName = RandomGenerator.name();
  const first = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        displayName,
      } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(first);
  const second = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        displayName,
      } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "profile id unchanged on same display name update",
    second.id,
    first.id,
  );
  TestValidator.equals(
    "display name unchanged on same display name update",
    second.displayName,
    first.displayName,
  );
  TestValidator.equals(
    "profile created_at unchanged on same display name update",
    second.created_at,
    first.created_at,
  );
  TestValidator.equals(
    "profile updated_at unchanged on same display name update",
    second.updated_at,
    first.updated_at,
  );
  TestValidator.equals(
    "profile deleted_at unchanged on same display name update",
    second.deleted_at,
    first.deleted_at,
  );
  TestValidator.equals(
    "member id unchanged on same display name update",
    second.member.id,
    first.member.id,
  );
  TestValidator.equals(
    "member email unchanged on same display name update",
    second.member.email,
    first.member.email,
  );
  TestValidator.equals(
    "member email verified unchanged on same display name update",
    second.member.email_verified,
    first.member.email_verified,
  );
  TestValidator.equals(
    "member created_at unchanged on same display name update",
    second.member.created_at,
    first.member.created_at,
  );
  TestValidator.equals(
    "member updated_at unchanged on same display name update",
    second.member.updated_at,
    first.member.updated_at,
  );
  TestValidator.equals(
    "member deleted_at unchanged on same display name update",
    second.member.deleted_at,
    first.member.deleted_at,
  );
}
