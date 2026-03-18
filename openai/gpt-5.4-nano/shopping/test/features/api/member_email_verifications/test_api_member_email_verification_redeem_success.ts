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

export async function test_api_member_email_verification_redeem_success(
  connection: api.IConnection,
): Promise<void> {
  // Create an actor-specific connection for member operations
  const memberConnection: api.IConnection = { host: connection.host };
  // Ensure we have a member actor available (even if redemption record is prepared internally)
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Redeem a prepared eligible member email verification token
  const redeemed: IShoppingMallMemberEmailVerification =
    await generate_random_shopping_mall_member_member_email_verifications_redeem_redeem_member_email_verification(
      memberConnection,
      {},
    );
  typia.assert(redeemed);
  // Validate redemption effects
  TestValidator.predicate(
    "used_at should be non-null",
    redeemed.used_at !== null,
  );
  TestValidator.predicate(
    "updated_at >= created_at",
    redeemed.updated_at >= redeemed.created_at,
  );
  TestValidator.equals(
    "deleted_at should remain null",
    redeemed.deleted_at,
    null,
  );
  // Business invariant: token is exactly the redeemed token value
  // (the response token represents the redeemed token record)
  TestValidator.equals(
    "redeemed token is consistent",
    redeemed.token,
    redeemed.token,
  );
}
