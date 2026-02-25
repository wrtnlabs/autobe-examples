import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_admin_user_bans_create } from "../../../generate/generate_random_ecommerce_administrator_admin_user_bans_create";
import { prepare_random_ecommerce_metadata_registry_relationship_of_variant_config } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship_of_variant_config";

/**
 * Test creating a successful customer ban by a regular administrator.
 * 1. Authenticate as administrator using join endpoint
 * 2. Create a customer ban record with detailed reason and optional duration
 * 3. Validate the ban record has proper timestamps and administrator linkage
 * 4. Verify appeal status defaults and ban duration is correctly set
 */
export async function test_api_administrator_user_ban_customer_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create customer ban record
  const banDuration = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
  >();
  const banRecord =
    await generate_random_ecommerce_administrator_admin_user_bans_create(
      adminConnection,
      {
        body: {
          user_type: "customer",
          ban_reason: "Violation of platform terms of service" satisfies string,
          ban_duration_days: banDuration satisfies number | null as
            | number
            | null,
          appeal_status: "none",
        },
      },
    );
  typia.assert(banRecord);
  // 3. Validate ban record properties
  TestValidator.predicate(
    "ban record has id",
    typeof banRecord.id === "string",
  );
  TestValidator.predicate(
    "id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      banRecord.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(banRecord.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(banRecord.updated_at).getTime()),
  );
  // 4. Validate administrator linkage
  TestValidator.predicate(
    "administrator has id",
    typeof banRecord.administrator.id === "string",
  );
  TestValidator.equals(
    "administrator email",
    banRecord.administrator.email,
    adminAuth.email,
  );
  // 5. Validate ban duration and appeal status
  TestValidator.predicate(
    "ban duration is positive",
    (banRecord as any).ban_duration_days === null || (banRecord as any).ban_duration_days > 0,
  );
  TestValidator.equals("appeal status", (banRecord as any).appeal_status, "none");
}