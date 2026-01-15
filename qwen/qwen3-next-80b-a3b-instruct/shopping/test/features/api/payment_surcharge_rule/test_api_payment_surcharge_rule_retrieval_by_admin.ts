import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSurchargeRule";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_surcharge_rule_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  // Generate random payment surcharge rule data that satisfies the schema
  const surchargeRule = typia.random<IShoppingMallPaymentSurchargeRule>();
  // Extract ruleId to use for retrieval
  const ruleId = surchargeRule.id;
  // Retrieve the surcharge rule using admin connection and ruleId
  const retrievedRule =
    await api.functional.shoppingMall.admin.payment_surcharge_rules.at(
      adminConnection,
      {
        ruleId: ruleId,
      },
    );
  // Validate the retrieved rule matches the schema
  typia.assert(retrievedRule);
  // Verify that the retrieved rule matches the created rule's data
  TestValidator.equals("retrieved rule ID matches", retrievedRule.id, ruleId);
  TestValidator.equals(
    "retrieved rule payment method ID matches",
    retrievedRule.payment_method_id,
    surchargeRule.payment_method_id,
  );
  TestValidator.equals(
    "retrieved rule region ID matches",
    retrievedRule.region_id,
    surchargeRule.region_id,
  );
  TestValidator.equals(
    "retrieved rule currency code matches",
    retrievedRule.currency_code,
    surchargeRule.currency_code,
  );
  TestValidator.equals(
    "retrieved rule min amount matches",
    retrievedRule.min_amount,
    surchargeRule.min_amount,
  );
  TestValidator.equals(
    "retrieved rule max amount matches",
    retrievedRule.max_amount,
    surchargeRule.max_amount,
  );
  TestValidator.equals(
    "retrieved rule priority matches",
    retrievedRule.priority,
    surchargeRule.priority,
  );
  TestValidator.equals(
    "retrieved rule applicable from matches",
    retrievedRule.applicable_from,
    surchargeRule.applicable_from,
  );
  TestValidator.equals(
    "retrieved rule applicable to matches",
    retrievedRule.applicable_to,
    surchargeRule.applicable_to,
  );
  TestValidator.equals(
    "retrieved rule surcharge amount matches",
    retrievedRule.surcharge_amount,
    surchargeRule.surcharge_amount,
  );
  TestValidator.equals(
    "retrieved rule surcharge percentage matches",
    retrievedRule.surcharge_percentage,
    surchargeRule.surcharge_percentage,
  );
  TestValidator.equals(
    "retrieved rule is active matches",
    retrievedRule.is_active,
    surchargeRule.is_active,
  );
  TestValidator.equals(
    "retrieved rule created at matches",
    retrievedRule.createdAt,
    surchargeRule.createdAt,
  );
  TestValidator.equals(
    "retrieved rule updated at matches",
    retrievedRule.updatedAt,
    surchargeRule.updatedAt,
  );
}
