import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_privacy_no_cross_user_access(
  connection: api.IConnection,
): Promise<void> {
  const display_name_a = `member-a-${RandomGenerator.alphaNumeric(12)}`;
  const display_name_b = `member-b-${RandomGenerator.alphaNumeric(12)}`;

  const makePassword = () => {
    const p = typia.random<string & tags.Format<"password">>();
    return typia.assert<IMultiUserTodoUserProfile.IJoin["password"]>(p);
  };

  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      display_name: display_name_a,
      password: makePassword(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });

  const profileA =
    await api.functional.multiUserTodo.member.profile.at(memberAConnection);
  typia.assert(profileA);

  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      display_name: display_name_b,
      password: makePassword(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });

  const profileB =
    await api.functional.multiUserTodo.member.profile.at(memberBConnection);
  typia.assert(profileB);

  TestValidator.notEquals(
    "profile id must be isolated per member",
    profileA.id,
    profileB.id,
  );
  TestValidator.notEquals(
    "display name must be isolated per member",
    profileA.display_name,
    profileB.display_name,
  );
  TestValidator.equals(
    "member A profile id matches authorized subject",
    profileA.id,
    memberAAuthorized.id,
  );
  TestValidator.equals(
    "member B profile id matches authorized subject",
    profileB.id,
    memberBAuthorized.id,
  );
}
