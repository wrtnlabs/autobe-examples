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

export async function test_api_profile_view_private_scope_isolation(
  connection: api.IConnection,
): Promise<void> {
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstAuthorized);
  const firstProfile = await api.functional.todoApp.member.profile.at(
    firstMemberConnection,
  );
  typia.assert(firstProfile);
  TestValidator.equals(
    "first profile belongs to first member id",
    firstProfile.member.id,
    firstAuthorized.id,
  );
  TestValidator.equals(
    "first profile belongs to first member email",
    firstProfile.member.email,
    firstAuthorized.email,
  );
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondAuthorized);
  const secondProfile = await api.functional.todoApp.member.profile.at(
    secondMemberConnection,
  );
  typia.assert(secondProfile);
  TestValidator.equals(
    "second profile belongs to second member id",
    secondProfile.member.id,
    secondAuthorized.id,
  );
  TestValidator.equals(
    "second profile belongs to second member email",
    secondProfile.member.email,
    secondAuthorized.email,
  );
  TestValidator.notEquals(
    "second profile does not expose first profile id",
    secondProfile.id,
    firstProfile.id,
  );
  TestValidator.notEquals(
    "second profile does not expose first member id",
    secondProfile.member.id,
    firstProfile.member.id,
  );
  TestValidator.notEquals(
    "second profile does not expose first member email",
    secondProfile.member.email,
    firstProfile.member.email,
  );
  if (secondProfile.displayName !== firstProfile.displayName) {
    TestValidator.notEquals(
      "second profile does not expose first display name when profiles differ",
      secondProfile.displayName,
      firstProfile.displayName,
    );
  }
}
