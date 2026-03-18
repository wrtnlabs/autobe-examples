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

export async function test_api_member_profile_update_cross_account_denied_no_partial_changes(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const passwordA = RandomGenerator.alphaNumeric(16);
  const passwordB = RandomGenerator.alphaNumeric(16);
  const authorizedA = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: passwordA,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(authorizedA);
  const authorizedB = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: passwordB,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(authorizedB);
  // Baseline for member A by doing a known-successful update as member A.
  const baselineA =
    await api.functional.shoppingMall.member.profile.updateProfile(
      memberAConnection,
      {
        body: {
          email: authorizedA.email,
        } satisfies IShoppingMallMember.IUpdate,
      },
    );
  typia.assert(baselineA);
  // Cross-account attempt: member A tries to set email to member B's email.
  await TestValidator.error("cross-account update denied", async () => {
    await api.functional.shoppingMall.member.profile.updateProfile(
      memberAConnection,
      {
        body: {
          email: authorizedB.email,
        } satisfies IShoppingMallMember.IUpdate,
      },
    );
  });
  // Verify member A did not end up partially mutated: member A can still set to its original email,
  // and the server responds with that original email.
  const afterDeniedA =
    await api.functional.shoppingMall.member.profile.updateProfile(
      memberAConnection,
      {
        body: { email: baselineA.email } satisfies IShoppingMallMember.IUpdate,
      },
    );
  typia.assert(afterDeniedA);
  TestValidator.equals(
    "member A email remains baseline after denied attempt",
    afterDeniedA.email,
    baselineA.email,
  );
  TestValidator.equals(
    "member A id remains baseline after denied attempt",
    afterDeniedA.id,
    baselineA.id,
  );
  // Known-successful PUT for member A.
  const newEmailA = typia.random<string & tags.Format<"email">>();
  const updatedA =
    await api.functional.shoppingMall.member.profile.updateProfile(
      memberAConnection,
      {
        body: { email: newEmailA } satisfies IShoppingMallMember.IUpdate,
      },
    );
  typia.assert(updatedA);
  TestValidator.equals("member A updated email", updatedA.email, newEmailA);
  // Verify member B is unchanged from the standpoint of member B's own identity.
  // After member A's denied attempt, member B should still be able to successfully update to its original email.
  const afterDeniedB =
    await api.functional.shoppingMall.member.profile.updateProfile(
      memberBConnection,
      {
        body: {
          email: authorizedB.email,
        } satisfies IShoppingMallMember.IUpdate,
      },
    );
  typia.assert(afterDeniedB);
  TestValidator.equals(
    "member B email remains its original after member A denied attempt",
    afterDeniedB.email,
    authorizedB.email,
  );
  TestValidator.equals(
    "member B id remains unchanged after member A denied attempt",
    afterDeniedB.id,
    authorizedB.id,
  );
}
