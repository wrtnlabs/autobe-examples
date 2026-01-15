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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformWarehouses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformWarehouses";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_warehouse_list_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Define pagination and filtering parameters
  const requestParams: ICommunityPlatformWarehouses.IRequest = {
    page: 1,
    limit: 10,
    location: "Seoul",
    capacity_min: 5000,
    capacity_max: 20000,
    status: "active",
    type: "fulfillment",
    integration_status: "integrated", // Changed from 'fully_integrated' to 'integrated' to match IRequest schema
  } satisfies ICommunityPlatformWarehouses.IRequest;
  // Step 3: Call warehouse list retrieval endpoint with admin connection
  const warehouseList =
    await api.functional.communityPlatform.admin.warehouses.index(
      adminConnection,
      {
        body: requestParams,
      },
    );
  typia.assert(warehouseList);
  // Step 4: Validate response structure matches IPageICommunityPlatformWarehouses.ISummary
  TestValidator.equals("page number is 1", warehouseList.pagination.current, 1);
  TestValidator.equals("limit is 10", warehouseList.pagination.limit, 10);
  TestValidator.predicate(
    "total records >= 0",
    warehouseList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages >= 1",
    warehouseList.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(warehouseList.data),
  );
  // Step 5: Validate warehouse summary data array structure
  // Handle both empty and non-empty data arrays
  // Validate enum values in warehouse data
  if (warehouseList.data.length > 0) {
    const firstWarehouse = warehouseList.data[0];
    // Validate string enums
    TestValidator.equals(
      "warehouse has valid warehouse_type",
      [
        "distribution",
        "fulfillment",
        "return",
        "storage",
        "cross_dock",
        "hub",
        "satellite",
      ].includes(firstWarehouse.warehouse_type),
      true,
    );
    TestValidator.equals(
      "warehouse has valid status",
      ["active", "inactive", "maintenance", "limited"].includes(
        firstWarehouse.status,
      ),
      true,
    );
    TestValidator.equals(
      "warehouse has valid integration_status",
      ["fully_integrated", "partially_integrated", "not_integrated"].includes(
        firstWarehouse.integration_status,
      ),
      true,
    );
    TestValidator.equals(
      "warehouse has valid automation_level",
      [
        "manual",
        "semi_automated",
        "highly_automated",
        "fully_automated",
      ].includes(firstWarehouse.automation_level),
      true,
    );
    TestValidator.equals(
      "warehouse has valid dock_level",
      ["level_1", "level_2", "level_3"].includes(firstWarehouse.dock_level),
      true,
    );
    TestValidator.equals(
      "warehouse has valid contract_type",
      ["in_house", "third_party", "joint_venture", "leased", "owned"].includes(
        firstWarehouse.contract_type,
      ),
      true,
    );
    TestValidator.equals(
      "warehouse has valid network_connectivity",
      ["fiber", "cable", "dsl", "wireless", "satellite", "hybrid"].includes(
        firstWarehouse.network_connectivity,
      ),
      true,
    );
    TestValidator.equals(
      "warehouse has valid backup_power",
      ["none", "generator", "battery", "solar", "hybrid"].includes(
        firstWarehouse.backup_power,
      ),
      true,
    );
    TestValidator.equals(
      "warehouse has valid electricity_type",
      ["single_phase", "three_phase"].includes(firstWarehouse.electricity_type),
      true,
    );
    TestValidator.equals(
      "warehouse has valid energy_certification",
      [
        "none",
        "leed",
        "breeam",
        "well",
        "living_building_challenge",
        "energy_star",
      ].includes(firstWarehouse.energy_certification),
      true,
    );
    TestValidator.equals(
      "warehouse has valid security_level",
      ["level_1", "level_2", "level_3", "level_4"].includes(
        firstWarehouse.security_level,
      ),
      true,
    );
    // Validate boolean fields
    TestValidator.equals(
      "is_primary is boolean",
      typeof firstWarehouse.is_primary === "boolean",
      true,
    );
    TestValidator.equals(
      "temperature_control is boolean",
      typeof firstWarehouse.temperature_control === "boolean",
      true,
    );
    TestValidator.equals(
      "humidity_control is boolean",
      typeof firstWarehouse.humidity_control === "boolean",
      true,
    );
    TestValidator.equals(
      "is_compliant is boolean",
      typeof firstWarehouse.is_compliant === "boolean",
      true,
    );
    TestValidator.equals(
      "vehicle_access is boolean",
      typeof firstWarehouse.vehicle_access === "boolean",
      true,
    );
    TestValidator.equals(
      "forklift_parking is boolean",
      typeof firstWarehouse.forklift_parking === "boolean",
      true,
    );
    TestValidator.equals(
      "bicycle_parking is boolean",
      typeof firstWarehouse.bicycle_parking === "boolean",
      true,
    );
    TestValidator.equals(
      "vehicle_type_restricted is boolean",
      typeof firstWarehouse.vehicle_type_restricted === "boolean",
      true,
    );
    // Validate numeric fields with range conditions
    TestValidator.predicate(
      "capacity_total >= 0",
      firstWarehouse.capacity_total >= 0,
    );
    TestValidator.predicate(
      "capacity_used >= 0",
      firstWarehouse.capacity_used >= 0,
    );
    TestValidator.predicate(
      "capacity_utilization between 0 and 1",
      firstWarehouse.capacity_utilization >= 0 &&
        firstWarehouse.capacity_utilization <= 1,
    );
    TestValidator.predicate(
      "inventory_count >= 0",
      firstWarehouse.inventory_count >= 0,
    );
    TestValidator.predicate(
      "item_quantity_total >= 0",
      firstWarehouse.item_quantity_total >= 0,
    );
    TestValidator.predicate(
      "carrier_count >= 0",
      firstWarehouse.carrier_count >= 0,
    );
    TestValidator.predicate(
      "reorder_threshold >= 0",
      firstWarehouse.reorder_threshold >= 0,
    );
    TestValidator.predicate(
      "max_capacity >= 0",
      firstWarehouse.max_capacity >= 0,
    );
    TestValidator.predicate(
      "avg_turnover_rate >= 0",
      firstWarehouse.avg_turnover_rate >= 0,
    );
    TestValidator.predicate(
      "avg_dwell_time >= 0",
      firstWarehouse.avg_dwell_time >= 0,
    );
    TestValidator.predicate(
      "total_maintenance_cost >= 0",
      firstWarehouse.total_maintenance_cost >= 0,
    );
    TestValidator.predicate(
      "maintenance_interval_days >= 0",
      firstWarehouse.maintenance_interval_days >= 0,
    );
    TestValidator.predicate(
      "receiving_docks >= 0",
      firstWarehouse.receiving_docks >= 0,
    );
    TestValidator.predicate(
      "shipping_docks >= 0",
      firstWarehouse.shipping_docks >= 0,
    );
    TestValidator.predicate(
      "floor_space_sqft >= 0",
      firstWarehouse.floor_space_sqft >= 0,
    );
    TestValidator.predicate(
      "ceiling_height_ft >= 0",
      firstWarehouse.ceiling_height_ft >= 0,
    );
    TestValidator.predicate(
      "pallet_racks >= 0",
      firstWarehouse.pallet_racks >= 0,
    );
    TestValidator.predicate(
      "bin_shelves >= 0",
      firstWarehouse.bin_shelves >= 0,
    );
    TestValidator.predicate(
      "automated_storage >= 0",
      firstWarehouse.automated_storage >= 0,
    );
    TestValidator.predicate(
      "mobile_racking >= 0",
      firstWarehouse.mobile_racking >= 0,
    );
    TestValidator.predicate("forklifts >= 0", firstWarehouse.forklifts >= 0);
    TestValidator.predicate(
      "pallet_jacks >= 0",
      firstWarehouse.pallet_jacks >= 0,
    );
    TestValidator.predicate("conveyors >= 0", firstWarehouse.conveyors >= 0);
    TestValidator.predicate(
      "robotic_vehicles >= 0",
      firstWarehouse.robotic_vehicles >= 0,
    );
    TestValidator.predicate(
      "emergency_exit_count >= 0",
      firstWarehouse.emergency_exit_count >= 0,
    );
    TestValidator.predicate(
      "access_control_count >= 0",
      firstWarehouse.access_control_count >= 0,
    );
    TestValidator.predicate(
      "security_camera_count >= 0",
      firstWarehouse.security_camera_count >= 0,
    );
    TestValidator.predicate(
      "power_rating_kw >= 0",
      firstWarehouse.power_rating_kw >= 0,
    );
    TestValidator.predicate(
      "reception_area_sqft >= 0",
      firstWarehouse.reception_area_sqft >= 0,
    );
    TestValidator.predicate(
      "office_area_sqft >= 0",
      firstWarehouse.office_area_sqft >= 0,
    );
    TestValidator.predicate(
      "break_area_sqft >= 0",
      firstWarehouse.break_area_sqft >= 0,
    );
    TestValidator.predicate(
      "warehouse_area_sqft >= 0",
      firstWarehouse.warehouse_area_sqft >= 0,
    );
    TestValidator.predicate(
      "restroom_count >= 0",
      firstWarehouse.restroom_count >= 0,
    );
    TestValidator.predicate(
      "kitchen_count >= 0",
      firstWarehouse.kitchen_count >= 0,
    );
    TestValidator.predicate(
      "emergency_kit_count >= 0",
      firstWarehouse.emergency_kit_count >= 0,
    );
    TestValidator.predicate(
      "training_room_count >= 0",
      firstWarehouse.training_room_count >= 0,
    );
    TestValidator.predicate(
      "parking_spaces >= 0",
      firstWarehouse.parking_spaces >= 0,
    );
    TestValidator.predicate(
      "loading_dock_count >= 0",
      firstWarehouse.loading_dock_count >= 0,
    );
    TestValidator.predicate(
      "truck_parking_count >= 0",
      firstWarehouse.truck_parking_count >= 0,
    );
    TestValidator.predicate(
      "electric_vehicle_charger_count >= 0",
      firstWarehouse.electric_vehicle_charger_count >= 0,
    );
    // Validate geographic coordinate ranges
    TestValidator.predicate(
      "address_lat between -90 and 90",
      firstWarehouse.address_lat >= -90 && firstWarehouse.address_lat <= 90,
    );
    TestValidator.predicate(
      "address_lng between -180 and 180",
      firstWarehouse.address_lng >= -180 && firstWarehouse.address_lng <= 180,
    );
    // Validate UUID format is guaranteed by typia.assert()
    // Validate arrays are not tested for type (guaranteed by typia.assert)
    // Validate string fields (name, code, location, region, etc.) are not tested for type (guaranteed by typia.assert)
  }
}