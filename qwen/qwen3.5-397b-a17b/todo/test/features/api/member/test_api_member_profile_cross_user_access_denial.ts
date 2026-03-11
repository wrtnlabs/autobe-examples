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

export async function test_api_member_profile_cross_user_access_denial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (requester)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Create second member (target profile owner)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member2Auth);
  // 3. First member attempts to access second member's profile
  // This should fail with error due to data isolation - members can only access their own profile
  await TestValidator.error("cross-user access denied", async () => {
    await api.functional.todoApp.members.at(member1Connection, {
      memberId: member2Auth.id,
    });
  });
  // 4. Validate that each member CAN access their own profile (positive test)
  const member1Profile = await api.functional.todoApp.members.at(
    member1Connection,
    {
      memberId: member1Auth.id,
    },
  );
  typia.assert(member1Profile);
  TestValidator.equals(
    "member1 can access own profile",
    member1Profile.id,
    member1Auth.id,
  );
  const member2Profile = await api.functional.todoApp.members.at(
    member2Connection,
    {
      memberId: member2Auth.id,
    },
  );
  typia.assert(member2Profile);
  TestValidator.equals(
    "member2 can access own profile",
    member2Profile.id,
    member2Auth.id,
  );
}
