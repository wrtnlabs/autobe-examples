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

export async function test_api_member_profile_update_own_profile_success_and_persisted(
  connection: api.IConnection,
): Promise<void> {
  // -----------------------------
  // Scenario 1: success update flow
  // -----------------------------
  const memberAConnection: api.IConnection = { host: connection.host };
  const passwordA = RandomGenerator.alphaNumeric(16);
  const emailA = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberAConnection, {
    body: {
      email: emailA,
      password: passwordA,
    } satisfies IShoppingMallMember.IJoin,
  });
  const updatedEmailA1 = typia.random<string & tags.Format<"email">>();
  const updated1 =
    await api.functional.shoppingMall.member.profile.updateProfile(
      memberAConnection,
      {
        body: { email: updatedEmailA1 } satisfies IShoppingMallMember.IUpdate,
      },
    );
  typia.assert(updated1);
  const updatedEmailA2 = typia.random<string & tags.Format<"email">>();
  const updated2 =
    await api.functional.shoppingMall.member.profile.updateProfile(
      memberAConnection,
      {
        body: { email: updatedEmailA2 } satisfies IShoppingMallMember.IUpdate,
      },
    );
  typia.assert(updated2);
  TestValidator.equals("member id preserved", updated2.id, updated1.id);
  TestValidator.equals(
    "member created_at preserved",
    updated2.created_at,
    updated1.created_at,
  );
  TestValidator.equals(
    "member deleted_at preserved",
    updated2.deleted_at,
    updated1.deleted_at,
  );
  TestValidator.equals(
    "member email updated to latest",
    updated2.email,
    updatedEmailA2,
  );
  TestValidator.notEquals(
    "member updated_at changed",
    updated2.updated_at,
    updated1.updated_at,
  );
  // -----------------------------
  // Scenario 2: ownership enforcement
  // -----------------------------
  const memberBConnection: api.IConnection = { host: connection.host };
  const passwordB = RandomGenerator.alphaNumeric(16);
  const emailB = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberBConnection, {
    body: {
      email: emailB,
      password: passwordB,
    } satisfies IShoppingMallMember.IJoin,
  });
  const aBefore =
    await api.functional.shoppingMall.member.profile.updateProfile(
      memberAConnection,
      {
        body: { email: updatedEmailA2 } satisfies IShoppingMallMember.IUpdate,
      },
    );
  typia.assert(aBefore);
  await TestValidator.error(
    "should deny updating another member profile (email takeover)",
    async () => {
      await api.functional.shoppingMall.member.profile.updateProfile(
        memberAConnection,
        {
          body: { email: emailB } satisfies IShoppingMallMember.IUpdate,
        },
      );
    },
  );
  const aAfter = await api.functional.shoppingMall.member.profile.updateProfile(
    memberAConnection,
    {
      body: { email: updatedEmailA2 } satisfies IShoppingMallMember.IUpdate,
    },
  );
  typia.assert(aAfter);
  TestValidator.equals(
    "member A email unchanged after denial",
    aAfter.email,
    aBefore.email,
  );
  TestValidator.equals(
    "member A id preserved after denial",
    aAfter.id,
    aBefore.id,
  );
  const updatedEmailA3 = typia.random<string & tags.Format<"email">>();
  const updated3 =
    await api.functional.shoppingMall.member.profile.updateProfile(
      memberAConnection,
      {
        body: { email: updatedEmailA3 } satisfies IShoppingMallMember.IUpdate,
      },
    );
  typia.assert(updated3);
  TestValidator.equals(
    "member A can update after denial",
    updated3.email,
    updatedEmailA3,
  );
  // -----------------------------
  // Scenario 3: data privacy/integrity
  // -----------------------------
  const privacyUpdate =
    await api.functional.shoppingMall.member.profile.updateProfile(
      memberAConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IShoppingMallMember.IUpdate,
      },
    );
  typia.assert(privacyUpdate);
}
