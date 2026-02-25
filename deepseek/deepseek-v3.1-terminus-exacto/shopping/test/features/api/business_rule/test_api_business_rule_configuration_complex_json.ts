import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_business_rule_configuration_complex_json(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Step 2: Generate a valid rule ID for testing (assuming rule exists in test environment)
  const ruleId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create complex JSON configuration as string
  const complexConfig = {
    validation_rules: {
      email_format: {
        pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        error_message: "Invalid email format",
      },
      password_strength: {
        min_length: 8,
        require_uppercase: true,
        require_numbers: true,
        require_special_chars: true,
      },
    },
    thresholds: {
      max_login_attempts: 5,
      session_timeout_minutes: 30,
      rate_limit: {
        requests_per_minute: 60,
        burst_capacity: 100,
      },
    },
    workflow_definitions: {
      user_registration: {
        steps: ["email_verification", "profile_completion", "approval"],
        timeout_hours: 24,
      },
      order_processing: {
        steps: ["payment_validation", "inventory_check", "shipping"],
        auto_cancel_after_days: 7,
      },
    },
    metadata: {
      created_by: "system",
      last_modified: new Date().toISOString(),
      version: "2.1.0",
    },
  };
  // Step 4: Update business rule with complex JSON configuration
  const updatedRule =
    await api.functional.ecommerce.superAdministrator.business_rules.update(
      superAdminConnection,
      {
        ruleId: ruleId,
        body: {
          rule_name: RandomGenerator.paragraph({ sentences: 1 }),
          rule_description: RandomGenerator.paragraph({ sentences: 2 }),
          rule_type: "workflow",
          configuration_json: complexConfig as Record<string, any>,
          execution_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          version: "2.0.0",
        } satisfies IEcommercePlatformEventOfCustomer.IUpdate,
      },
    );
  typia.assert(updatedRule);
  // Step 5: Validate the update operation
  TestValidator.equals(
    "rule type should be workflow",
    updatedRule.rule_type,
    "workflow",
  );
  // Validate complex JSON configuration was properly stored and parsed
  TestValidator.predicate("configuration_json should be parseable", () => {
    try {
      JSON.parse(updatedRule.configuration_json);
      return true;
    } catch {
      return false;
    }
  });
  const parsedConfig = JSON.parse(updatedRule.configuration_json);
  TestValidator.predicate(
    "configuration should have validation_rules",
    parsedConfig.validation_rules !== undefined,
  );
  TestValidator.predicate(
    "configuration should have thresholds",
    parsedConfig.thresholds !== undefined,
  );
  TestValidator.predicate(
    "configuration should have workflow_definitions",
    parsedConfig.workflow_definitions !== undefined,
  );
  // Validate specific nested properties
  TestValidator.predicate(
    "email format pattern should exist",
    parsedConfig.validation_rules?.email_format?.pattern !== undefined,
  );
  TestValidator.predicate(
    "rate limit should be configured",
    parsedConfig.thresholds?.rate_limit?.requests_per_minute !== undefined,
  );
  TestValidator.predicate(
    "user registration workflow should exist",
    parsedConfig.workflow_definitions?.user_registration?.steps !== undefined,
  );
  // Validate immutable fields exist (preserved from existing rule)
  TestValidator.predicate(
    "rule code should exist",
    updatedRule.rule_code !== undefined,
  );
  TestValidator.predicate(
    "created at should exist",
    updatedRule.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at should be valid date",
    !isNaN(new Date(updatedRule.updated_at).getTime()),
  );
}