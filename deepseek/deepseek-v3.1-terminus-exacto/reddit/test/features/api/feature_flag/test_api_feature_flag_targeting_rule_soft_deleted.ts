import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_feature_flag_targeting_rule_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin using utility function admin join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate IDs for the parent resources and targeting rule
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  const environmentId = typia.random<string & tags.Format<"uuid">>();
  const targetingRuleId = typia.random<string & tags.Format<"uuid">>();
  // Note: In a real scenario, we would create a feature flag, environment, and targeting rule here,
  // then soft delete the targeting rule via appropriate APIs before retrieval.
  // Since those APIs are not provided, we assume the targeting rule already exists with given IDs
  // and has been soft-deleted by the system.
  // Retrieve the soft-deleted targeting rule
  const targetingRule =
    await api.functional.communityPlatform.admin.feature_flags.environments.targeting_rules.at(
      adminConnection,
      {
        featureFlagId,
        environmentId,
        targetingRuleId,
      },
    );
  typia.assert(targetingRule);
  // Validate that the targeting rule response is correctly formed
  TestValidator.predicate(
    "targeting rule id matches input",
    targetingRule.id === targetingRuleId,
  );
  TestValidator.predicate(
    "rule_key is string",
    typeof targetingRule.rule_key === "string",
  );
  TestValidator.predicate(
    "rule_value is string",
    typeof targetingRule.rule_value === "string",
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      targetingRule.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      targetingRule.updated_at,
    ),
  );
  // The critical validation: deleted_at should be set (non-null) for a soft-deleted rule
  TestValidator.predicate(
    "deleted_at is set (soft-deleted)",
    targetingRule.deleted_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is valid date-time if present",
    targetingRule.deleted_at === null ||
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
        targetingRule.deleted_at,
      ),
  );
}
