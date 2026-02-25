import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOversight";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_administrative_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_create";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

export async function test_api_platform_oversight_retrieve_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(administrator);
  // 2. Create administrative action as per scenario
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: RandomGenerator.alphabets(10),
          general_description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(administrativeAction);
  // 3. Since we cannot create oversight records directly (no POST endpoint),
  // and we need a valid oversight ID to test retrieval,
  // we'll demonstrate the pattern with a UUID format.
  // In a real test environment, oversight records would be pre-seeded
  // or created by the system when administrative actions are performed.
  const oversightId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve oversight record
  // This tests the retrieval endpoint works correctly when called with proper authentication
  // The actual oversight may not exist, but we test the endpoint signature and auth
  const oversight =
    await api.functional.ecommerce.administrator.platform_oversights.at(
      adminConnection,
      {
        platformOversightId: oversightId,
      },
    );
  typia.assert(oversight);
  // 5. Validate response structure contains all expected fields
  TestValidator.equals(
    "oversight_type is string",
    typeof oversight.oversight_type,
    "string",
  );
  TestValidator.predicate(
    "metrics_json is object",
    () =>
      typeof oversight.metrics_json === "object" &&
      oversight.metrics_json !== null,
  );
  TestValidator.predicate(
    "findings is string or null or undefined",
    () =>
      oversight.findings === null ||
      oversight.findings === undefined ||
      typeof oversight.findings === "string",
  );
  TestValidator.equals(
    "severity_level is string",
    typeof oversight.severity_level,
    "string",
  );
  TestValidator.equals(
    "resolved is boolean",
    typeof oversight.resolved,
    "boolean",
  );
  TestValidator.equals(
    "created_at is string",
    typeof oversight.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is string",
    typeof oversight.updated_at,
    "string",
  );
  // Validate administrator summary exists and has correct structure
  const admin = oversight.administrator;
  TestValidator.predicate(
    "administrator exists",
    () => admin !== null && admin !== undefined,
  );
  TestValidator.equals("administrator.id is string", typeof admin.id, "string");
  TestValidator.equals(
    "administrator.email is string",
    typeof admin.email,
    "string",
  );
  TestValidator.equals(
    "administrator.created_at is string",
    typeof admin.created_at,
    "string",
  );
  // Additional validation of date-time formats (implied by DTO)
  // typia.assert already validated format constraints from DTO definitions
  // Validate metrics_json structure
  TestValidator.predicate("metrics_json has string values", () => {
    for (const key in oversight.metrics_json) {
      if (typeof oversight.metrics_json[key] !== "string") {
        return false;
      }
    }
    return true;
  });
}
