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

export async function test_api_member_profile_read_own_profile_and_privacy_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAJoin = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAJoin);
  const ownProfile = await api.functional.todoApp.member.profiles.at(
    memberAConnection,
    {
      profileId: memberAJoin.id,
    },
  );
  typia.assert(ownProfile);
  TestValidator.equals(
    "profile id matches authenticated member",
    ownProfile.id,
    memberAJoin.id,
  );
  TestValidator.equals(
    "deleted_at should be null for active profile",
    ownProfile.deleted_at,
    null,
  );
  // Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBJoin = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberBJoin);
  await TestValidator.error(
    "member B must not access member A profile",
    async () => {
      await api.functional.todoApp.member.profiles.at(memberBConnection, {
        profileId: memberAJoin.id,
      });
    },
  );
}
