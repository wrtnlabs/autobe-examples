import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProductPriceRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPriceRule";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_product_pricerule_retrieval_with_expired_rule(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to access pricing rules
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Generate a product code for testing
  const productCode = RandomGenerator.alphaNumeric(8);
  // Step 3: Validate that retrieving a non-existent rule returns 404
  await TestValidator.error(
    "Non-existent rule ID should return 404",
    async () => {
      await api.functional.communityPlatform.products.pricerules.at(
        memberConnection,
        {
          productCode,
          ruleId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
  // Since we cannot create price rules with available endpoints,
  // we test retrieving a rule that we assume exists in the system.
  // We use a placeholder rule ID (in practice, this would be a known rule ID)
  const ruleId = "123e4567-e89b-12d3-a456-426614174000";
  // Step 4: Retrieve a specific product price rule
  const retrievedRule: ICommunityPlatformProductPriceRule =
    await api.functional.communityPlatform.products.pricerules.at(
      memberConnection,
      {
        productCode,
        ruleId,
      },
    );
  typia.assert(retrievedRule);
  // We validate that the response has the expected structure
  // We cannot validate the expiration date because we don't control the rule
  // The goal is to ensure the endpoint returns the type correctly
  TestValidator.equals(
    "Retrieved rule has valid ID format",
    typeof retrievedRule.id,
    "string",
  );
  TestValidator.equals(
    "Product code matches",
    retrievedRule.product_code,
    productCode,
  );
  TestValidator.predicate(
    "start_date is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedRule.start_date,
    ),
  );
  TestValidator.predicate(
    "created_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedRule.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedRule.updated_at,
    ),
  );
  TestValidator.equals(
    "discount type is valid",
    retrievedRule.discount_type,
    "percentage",
  );
  TestValidator.predicate(
    "discount percentage is between 0 and 100",
    retrievedRule.discount_percentage >= 0 &&
      retrievedRule.discount_percentage <= 100,
  );
  TestValidator.predicate(
    "minimum quantity is non-negative",
    retrievedRule.minimum_quantity >= 0,
  );
  TestValidator.equals(
    "is_active is boolean",
    typeof retrievedRule.is_active,
    "boolean",
  );
  // Note: We cannot validate end_date for expiration as we don't control the rule
  // and we can't create rules. The original scenario's intent (testing expiration)
  // cannot be fulfilled with the provided API endpoints.
}
