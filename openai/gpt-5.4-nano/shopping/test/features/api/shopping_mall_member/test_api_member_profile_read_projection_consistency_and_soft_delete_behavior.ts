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

export async function test_api_member_profile_read_projection_consistency_and_soft_delete_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Scenario A: Active member profile read projection consistency
  // 1) Join a member via POST /shoppingMall/auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string &
        tags.Format<"password">,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(authorized);
  // Actor-specific authenticated connection
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2) Call GET /shoppingMall/member/profile
  const profile1 =
    await api.functional.shoppingMall.member.profile.at(authorizedConnection);
  typia.assert(profile1);
  // 3) Validate timestamps presence/format and active soft-delete state
  TestValidator.equals(
    "deleted_at should be null for active member",
    profile1.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    () => !Number.isNaN(Date.parse(profile1.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    () => !Number.isNaN(Date.parse(profile1.updated_at)),
  );
  // 4) Read stability: call GET again immediately
  const profile2 =
    await api.functional.shoppingMall.member.profile.at(authorizedConnection);
  typia.assert(profile2);
  // Stable fields should remain unchanged across reads
  TestValidator.equals("id unchanged across reads", profile2.id, profile1.id);
  TestValidator.equals(
    "email unchanged across reads",
    profile2.email,
    profile1.email,
  );
  TestValidator.equals(
    "created_at unchanged across reads",
    profile2.created_at,
    profile1.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged across reads",
    profile2.deleted_at,
    profile1.deleted_at,
  );
  // Scenario B (soft-delete edge): A deterministic soft-delete endpoint was not provided.
  // We therefore only validate active-member read behavior.
}
