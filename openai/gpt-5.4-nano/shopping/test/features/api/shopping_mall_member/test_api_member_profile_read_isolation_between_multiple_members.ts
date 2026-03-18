import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_read_isolation_between_multiple_members(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A join
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  // 2) Member B join
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  // 3) Member A reads profile
  const profileA1 =
    await api.functional.shoppingMall.member.profile.at(memberAConnection);
  typia.assert(profileA1);
  TestValidator.equals(
    "member A id matches",
    profileA1.id,
    memberAAuthorized.id,
  );
  TestValidator.equals(
    "member A email matches",
    profileA1.email,
    memberAAuthorized.email,
  );
  TestValidator.equals(
    "member A deleted_at is null",
    profileA1.deleted_at,
    null,
  );
  // 4) Validate isolation: A should not see B
  TestValidator.notEquals(
    "member A should not see member B id",
    profileA1.id,
    memberBAuthorized.id,
  );
  TestValidator.notEquals(
    "member A should not see member B email",
    profileA1.email,
    memberBAuthorized.email,
  );
  // 5) Member B reads profile
  const profileB1 =
    await api.functional.shoppingMall.member.profile.at(memberBConnection);
  typia.assert(profileB1);
  TestValidator.equals(
    "member B id matches",
    profileB1.id,
    memberBAuthorized.id,
  );
  TestValidator.equals(
    "member B email matches",
    profileB1.email,
    memberBAuthorized.email,
  );
  TestValidator.equals(
    "member B deleted_at is null",
    profileB1.deleted_at,
    null,
  );
  // 6) Validate isolation: B should not see A
  TestValidator.notEquals(
    "member B should not see member A id",
    profileB1.id,
    memberAAuthorized.id,
  );
  TestValidator.notEquals(
    "member B should not see member A email",
    profileB1.email,
    memberAAuthorized.email,
  );
  // Scenario B: repeatability for member A
  const profileA2 =
    await api.functional.shoppingMall.member.profile.at(memberAConnection);
  typia.assert(profileA2);
  TestValidator.equals("repeat read A id", profileA2.id, profileA1.id);
  TestValidator.equals("repeat read A email", profileA2.email, profileA1.email);
  TestValidator.equals(
    "repeat read A deleted_at is null",
    profileA2.deleted_at,
    null,
  );
}
