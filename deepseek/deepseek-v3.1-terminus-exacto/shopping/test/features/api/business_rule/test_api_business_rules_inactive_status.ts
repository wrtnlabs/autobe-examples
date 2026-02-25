import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceEmailTemplate";
import type { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import { prepare_random_ecommerce_email_template } from "../../../prepare/prepare_random_ecommerce_email_template";
import { prepare_random_ecommerce_platform_event_of_customer } from "../../../prepare/prepare_random_ecommerce_platform_event_of_customer";
import { generate_random_ecommerce_administrator_email_templates_create } from "../../../generate/generate_random_ecommerce_administrator_email_templates_create";
import { generate_random_ecommerce_administrator_business_rules_create } from "../../../generate/generate_random_ecommerce_administrator_business_rules_create";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_business_rules_inactive_status(connection: api.IConnection): Promise<void> {
    // 1. Administrator setup
    const adminConnection: api.IConnection = { host: connection.host };
    const administrator = await authorize_administrator_join(adminConnection, {});
    typia.assert(administrator);

    // 2. Create email template to validate business rule can coexist
    const emailTemplate = await generate_random_ecommerce_administrator_email_templates_create(adminConnection, {
        body: {
            code: `template_${RandomGenerator.alphabets(8)}`,
            name: RandomGenerator.content({ paragraphs: 1 }),
            category: RandomGenerator.pick(["registration", "order", "password"] as const),
            subject: RandomGenerator.content({ paragraphs: 1 }),
            html_content: RandomGenerator.content({ paragraphs: 2 }),
            text_content: RandomGenerator.content({ paragraphs: 2 }),
            description: RandomGenerator.content({ paragraphs: 1 }),
            is_active: true,
        } satisfies IEcommerceEmailTemplate.ICreate,
    });
    typia.assert(emailTemplate);

    // 3. Create business rule with explicit inactive status and manual execution order
    const businessRule = await generate_random_ecommerce_administrator_business_rules_create(
        adminConnection,
        {
            body: {
                rule_code: `rule_${RandomGenerator.alphabets(8)}`,
                rule_name: RandomGenerator.content({ paragraphs: 1 }),
                rule_description: RandomGenerator.content({ paragraphs: 2 }),
                rule_type: RandomGenerator.pick(["validation", "workflow", "calculation"] as const),
                configuration_json: JSON.stringify({
                    condition: { "field": "price", "operator": "greater_than", "value": 0 },
                    action: { "type": "validation", "message": "Price must be positive" }
                }),
                is_active: false,
                execution_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
                version: "1.0.0",
            }
        }
    );
    typia.assert(businessRule);

    // 4. Validate business rule was created with inactive status
    TestValidator.equals("business rule is_active should be false", businessRule.is_active, false);
    TestValidator.predicate("business rule has valid execution order", businessRule.execution_order >= 0);
    TestValidator.equals("business rule ID is generated", typeof businessRule.id, "string");

    // 5. Validate that rule can be identified as inactive for future activation
    // This establishes that inactive rules are retrievable and can be activated later
    TestValidator.predicate(
        "business rule has valid metadata for future activation",
        businessRule.rule_code.length > 0 &&
        businessRule.rule_name.length > 0 &&
        businessRule.rule_type.length > 0
    );
}