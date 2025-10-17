import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumFeatureFlag";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_feature_flag_retrieval_admin_full_value(
  connection: api.IConnection,
) {
  /**
   * Administrator retrieval of a feature flag (adapted to available DTO).
   *
   * Notes:
   *
   * - The original test brief requested validation of `value` and `is_public`.
   *   Those fields are not present in the provided
   *   IEconPoliticalForumFeatureFlag DTO. This test therefore verifies
   *   administrator access and asserts the canonical fields declared by the
   *   DTO: id, key, enabled, rollout_percentage, description, created_at,
   *   updated_at, deleted_at.
   * - Audit log verification is not implemented because no audit-retrieval API
   *   function was provided in the materials.
   */

  // 1) Administrator registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Str0ngPass!2025",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  // Validate admin authorization shape
  typia.assert<IEconPoliticalForumAdministrator.IAuthorized>(admin);

  // 2) Retrieve a feature flag as an administrator
  // Use a random UUID for the id (in a simulated environment this will
  // return a random IEconPoliticalForumFeatureFlag); in a real test,
  // replace with a deterministic id for a known non-public flag.
  const featureFlagId: string = typia.random<string & tags.Format<"uuid">>();

  const flag: IEconPoliticalForumFeatureFlag =
    await api.functional.econPoliticalForum.featureFlags.at(connection, {
      featureFlagId,
    });
  // Validate response shape against DTO
  typia.assert<IEconPoliticalForumFeatureFlag>(flag);

  // 3) Business-level assertions (beyond typia.assert structural validation)
  TestValidator.predicate(
    "feature flag: id exists",
    flag.id !== undefined && flag.id !== null,
  );
  TestValidator.predicate(
    "feature flag: key is non-empty",
    typeof flag.key === "string" && flag.key.length > 0,
  );
  TestValidator.predicate(
    "feature flag: enabled is boolean",
    typeof flag.enabled === "boolean",
  );

  if (
    flag.rollout_percentage !== null &&
    flag.rollout_percentage !== undefined
  ) {
    TestValidator.predicate(
      "feature flag: rollout_percentage within 0..100",
      typeof flag.rollout_percentage === "number" &&
        flag.rollout_percentage >= 0 &&
        flag.rollout_percentage <= 100,
    );
  }

  TestValidator.predicate(
    "feature flag: created_at present",
    typeof flag.created_at === "string" && flag.created_at.length > 0,
  );
  TestValidator.predicate(
    "feature flag: updated_at present",
    typeof flag.updated_at === "string" && flag.updated_at.length > 0,
  );

  if (flag.deleted_at !== null && flag.deleted_at !== undefined) {
    TestValidator.predicate(
      "feature flag: deleted_at is string when present",
      typeof flag.deleted_at === "string",
    );
  }
}
