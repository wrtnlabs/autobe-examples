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

export async function test_api_member_email_verification_redeem_expired_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(joinResult);
  // Try to locate a verification token from the join flow response.
  // IShoppingMallMember.IAuthorized DTO provided does not include it,
  // so we probe at runtime.
  const joinRecord: Record<string, unknown> = joinResult as unknown as Record<
    string,
    unknown
  >;
  const candidateToken: string | undefined =
    (typeof joinRecord["member_email_verification_token"] === "string"
      ? (joinRecord["member_email_verification_token"] as string)
      : undefined) ??
    (typeof joinRecord["email_verification_token"] === "string"
      ? (joinRecord["email_verification_token"] as string)
      : undefined) ??
    (typeof joinRecord["verification_token"] === "string"
      ? (joinRecord["verification_token"] as string)
      : undefined) ??
    (typeof joinRecord["token"] === "string"
      ? (joinRecord["token"] as string)
      : undefined);
  TestValidator.predicate(
    "join result should provide an email verification token",
    () => candidateToken !== undefined,
  );
  const expiredToken = candidateToken!;
  const redeemConnection: api.IConnection = { host: connection.host };
  const redeemInput = {
    token: expiredToken,
  } satisfies IShoppingMallMemberEmailVerification.ICreate;
  await TestValidator.error(
    "redeeming an expired email verification token should be rejected",
    async () => {
      await generate_random_shopping_mall_member_member_email_verifications_redeem_redeem_member_email_verification(
        redeemConnection,
        {
          body: redeemInput,
        },
      );
    },
  );
  // State invariant robustness: subsequent redemption attempts should still be rejected.
  await TestValidator.error(
    "redeeming the same expired token again should still be rejected",
    async () => {
      await generate_random_shopping_mall_member_member_email_verifications_redeem_redeem_member_email_verification(
        redeemConnection,
        {
          body: redeemInput,
        },
      );
    },
  );
  // Concurrency robustness: multiple concurrent redeem calls must all fail.
  await TestValidator.error(
    "concurrent redemption attempts for the same expired token should all be rejected",
    async () => {
      const attempts = ArrayUtil.repeat(5, () =>
        generate_random_shopping_mall_member_member_email_verifications_redeem_redeem_member_email_verification(
          redeemConnection,
          {
            body: redeemInput,
          },
        )
          .then(() => ({ ok: false as const }))
          .catch(() => ({ ok: true as const })),
      );
      const results = await Promise.all(attempts);
      TestValidator.predicate(
        "all concurrent attempts should be rejected",
        () => results.every((r) => r.ok === true),
      );
    },
  );
}
