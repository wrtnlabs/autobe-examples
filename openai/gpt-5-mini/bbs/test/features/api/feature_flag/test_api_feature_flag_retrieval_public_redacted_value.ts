import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalForumFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumFeatureFlag";

export async function test_api_feature_flag_retrieval_public_redacted_value(
  connection: api.IConnection,
) {
  /**
   * Validate public retrieval of a feature flag returns only non-sensitive
   * canonical fields and omits/redacts any sensitive configuration values.
   *
   * Notes:
   *
   * - The DTO IEconPoliticalForumFeatureFlag does not declare `value` or
   *   `is_public`. Therefore this test verifies that common sensitive key names
   *   are not present in the public response rather than asserting server-side
   *   `is_public` semantics.
   * - In simulation mode (connection.simulate === true) the SDK will return mock
   *   data. In non-simulate mode, ensure a valid feature flag exists for the
   *   generated UUID or replace the UUID with a test fixture ID.
   */

  // Use an unauthenticated copy of the connection for public access checks
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Use a random UUID; in simulation this is validated by SDK mock generator.
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();

  // Call the endpoint as a public consumer
  const output: IEconPoliticalForumFeatureFlag =
    await api.functional.econPoliticalForum.featureFlags.at(unauthConn, {
      featureFlagId,
    });

  // Validate the response shape
  typia.assert(output);

  // Business assertions: canonical fields and types
  TestValidator.predicate(
    "feature-flag: has id (string)",
    typeof output.id === "string",
  );
  TestValidator.predicate(
    "feature-flag: has key (string)",
    typeof output.key === "string",
  );
  TestValidator.predicate(
    "feature-flag: enabled is boolean",
    typeof output.enabled === "boolean",
  );
  TestValidator.predicate(
    "feature-flag: created_at is string",
    typeof output.created_at === "string",
  );
  TestValidator.predicate(
    "feature-flag: updated_at is string",
    typeof output.updated_at === "string",
  );

  TestValidator.predicate(
    "feature-flag: rollout_percentage is number or null/undefined",
    output.rollout_percentage === null ||
      output.rollout_percentage === undefined ||
      typeof output.rollout_percentage === "number",
  );

  TestValidator.predicate(
    "feature-flag: description is string or null/undefined",
    output.description === null ||
      output.description === undefined ||
      typeof output.description === "string",
  );

  TestValidator.predicate(
    "feature-flag: deleted_at is null/undefined or string",
    output.deleted_at === null ||
      output.deleted_at === undefined ||
      typeof output.deleted_at === "string",
  );

  // Ensure sensitive or privileged keys are not leaked to public callers
  const forbiddenKeys = [
    "value",
    "secret",
    "credentials",
    "private_value",
    "is_public",
    "environment",
  ];
  TestValidator.predicate(
    "feature-flag: sensitive keys are omitted for public consumers",
    forbiddenKeys.every((k) => !(k in output)),
  );
}
