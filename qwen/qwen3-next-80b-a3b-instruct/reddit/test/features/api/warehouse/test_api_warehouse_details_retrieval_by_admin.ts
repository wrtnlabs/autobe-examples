import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformWarehouses } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformWarehouses";
import { prepare_random_community_platform_warehouses } from "../../../prepare/prepare_random_community_platform_warehouses";
import { generate_random_community_platform_warehouses_create } from "../../../generate/generate_random_community_platform_warehouses_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_warehouse_details_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access protected warehouse details using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Admin authorization has updated adminConnection.headers internally
  // Step 2: Create a warehouse entity to retrieve details for using the utility function
  const warehouse: ICommunityPlatformWarehouses =
    await generate_random_community_platform_warehouses_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          address: "123 Admin Street, Test City", // Required for address
          capacity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          current_occupancy: 0,
          is_active: true,
          warehouse_type: RandomGenerator.pick([
            "distribution",
            "fulfillment",
            "storage",
            "crossdock",
          ] as const),
          security_level: RandomGenerator.pick([
            "standard",
            "high",
            "critical",
          ] as const),
          lat: typia.random<number & tags.Minimum<-90> & tags.Maximum<90>>(),
          lng: typia.random<number & tags.Minimum<-180> & tags.Maximum<180>>(),
          size: RandomGenerator.pick([
            "small",
            "medium",
            "large",
            "enterprise",
          ] as const),
          region: "Asia-Pacific",
          timezone: "Asia/Seoul",
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile("+82"),
          carrier_integration_ids: ArrayUtil.repeat(2, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
          temperature_control: RandomGenerator.pick([true, false] as const),
          humidity_control: RandomGenerator.pick([true, false] as const),
        } satisfies ICommunityPlatformWarehouses.ICreate,
      },
    );
  typia.assert(warehouse);
  // Step 3: Retrieve the warehouse details using the exact endpoint with admin connection
  // Using the SDK function directly because it's the target endpoint being tested
  const retrievedWarehouse: ICommunityPlatformWarehouses =
    await api.functional.communityPlatform.admin.warehouses.at(
      adminConnection,
      {
        warehouseId: warehouse.id,
      },
    );
  typia.assert(retrievedWarehouse);
  // Step 4: Validate that retrieved warehouse data matches created warehouse data
  // TestValidator.equals with proper title parameter for all fields
  TestValidator.equals(
    "warehouse id matches",
    retrievedWarehouse.id,
    warehouse.id,
  );
  TestValidator.equals(
    "warehouse name matches",
    retrievedWarehouse.name,
    warehouse.name,
  );
  TestValidator.equals(
    "warehouse location matches",
    retrievedWarehouse.location,
    warehouse.location,
  );
  TestValidator.equals(
    "warehouse capacity matches",
    retrievedWarehouse.capacity,
    warehouse.capacity,
  );
  TestValidator.equals(
    "warehouse operational status matches",
    retrievedWarehouse.operational_status,
    warehouse.operational_status,
  );
  TestValidator.equals(
    "warehouse temperature control matches",
    retrievedWarehouse.temperature_control,
    warehouse.temperature_control,
  );
  TestValidator.equals(
    "warehouse humidity control matches",
    retrievedWarehouse.humidity_control,
    warehouse.humidity_control,
  );
  TestValidator.equals(
    "warehouse carrier integration IDs match",
    retrievedWarehouse.carrier_integration_ids,
    warehouse.carrier_integration_ids,
  );
  TestValidator.equals(
    "warehouse contact email matches",
    retrievedWarehouse.contact_email,
    warehouse.contact_email,
  );
  TestValidator.equals(
    "warehouse contact phone matches",
    retrievedWarehouse.contact_phone,
    warehouse.contact_phone,
  );
  TestValidator.equals(
    "warehouse security level matches",
    retrievedWarehouse.security_level,
    warehouse.security_level,
  );
  TestValidator.equals(
    "warehouse latitude matches",
    retrievedWarehouse.lat,
    warehouse.lat,
  );
  TestValidator.equals(
    "warehouse longitude matches",
    retrievedWarehouse.lng,
    warehouse.lng,
  );
  TestValidator.equals(
    "warehouse warehouse type matches",
    retrievedWarehouse.warehouse_type,
    warehouse.warehouse_type,
  );
  TestValidator.equals(
    "warehouse size matches",
    retrievedWarehouse.size,
    warehouse.size,
  );
  TestValidator.equals(
    "warehouse region matches",
    retrievedWarehouse.region,
    warehouse.region,
  );
  TestValidator.equals(
    "warehouse timezone matches",
    retrievedWarehouse.timezone,
    warehouse.timezone,
  );
  TestValidator.equals(
    "warehouse description matches",
    retrievedWarehouse.description,
    warehouse.description,
  );
  TestValidator.equals(
    "warehouse city matches",
    retrievedWarehouse.city,
    warehouse.city,
  );
  TestValidator.equals(
    "warehouse state matches",
    retrievedWarehouse.state,
    warehouse.state,
  );
  TestValidator.equals(
    "warehouse postal code matches",
    retrievedWarehouse.postal_code,
    warehouse.postal_code,
  );
  TestValidator.equals(
    "warehouse country matches",
    retrievedWarehouse.country,
    warehouse.country,
  );
}
