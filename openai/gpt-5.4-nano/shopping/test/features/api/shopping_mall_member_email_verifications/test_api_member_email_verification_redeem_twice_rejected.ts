import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_member_email_verifications_redeem_redeem_member_email_verification } from "../../../generate/generate_random_shopping_mall_member_member_email_verifications_redeem_redeem_member_email_verification";
import { prepare_random_shopping_mall_member_email_verification } from "../../../prepare/prepare_random_shopping_mall_member_email_verification";

export async function test_api_member_email_verification_redeem_twice_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create a member account via utility so the server issues tokens/sessions.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });

  // Generate a redeemable verification record by redeeming once successfully.
  const redeemed1: IShoppingMallMemberEmailVerification =
    await generate_random_shopping_mall_member_member_email_verifications_redeem_redeem_member_email_verification(
      memberConnection,
      {},
    );

  typia.assert(redeemed1);
  TestValidator.predicate(
    "first redemption should set used_at",
    redeemed1.used_at !== null,
  );
  const usedAt1 = redeemed1.used_at;
  const verificationToken = redeemed1.token;

  // Second redemption with the exact same token must be rejected.
  await TestValidator.error(
    "second redemption with same token should be rejected",
    async () => {
      await generate_random_shopping_mall_member_member_email_verifications_redeem_redeem_member_email_verification(
        memberConnection,
        {
          body: {
            token: verificationToken,
          } satisfies IShoppingMallMemberEmailVerification.ICreate,
        },
      );
    },
  );

  // State integrity: used_at from the successful first redemption remains non-null.
  TestValidator.equals(
    "used_at should remain unchanged",
    redeemed1.used_at,
    usedAt1,
  );
}
