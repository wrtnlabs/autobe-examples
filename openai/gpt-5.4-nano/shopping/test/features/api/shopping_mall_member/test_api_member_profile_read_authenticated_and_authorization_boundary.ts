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

export async function test_api_member_profile_read_authenticated_and_authorization_boundary(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate member (actor-isolated connection)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorized);
  // Scenario A: authenticated member reads their own profile (1st read)
  const profile1 =
    await api.functional.shoppingMall.member.profile.at(memberConnection);
  typia.assert(profile1);
  TestValidator.equals(
    "profile id matches authenticated member",
    profile1.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile email matches authenticated member",
    profile1.email,
    authorized.email,
  );
  // Scenario A: consistency check (2nd read)
  const profile2 =
    await api.functional.shoppingMall.member.profile.at(memberConnection);
  typia.assert(profile2);
  TestValidator.equals("profile id stable", profile2.id, profile1.id);
  TestValidator.equals("profile email stable", profile2.email, profile1.email);
  TestValidator.equals(
    "profile created_at stable",
    profile2.created_at,
    profile1.created_at,
  );
  TestValidator.equals(
    "profile updated_at stable",
    profile2.updated_at,
    profile1.updated_at,
  );
  TestValidator.equals(
    "profile deleted_at stable",
    profile2.deleted_at,
    profile1.deleted_at,
  );
  // Scenario B: authorization boundary — unauthenticated request rejected
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated member profile read should be rejected",
    async () => {
      await api.functional.shoppingMall.member.profile.at(unauthConnection);
    },
  );
}
