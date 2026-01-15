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
export async function test_api_warehouse_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create warehouse with valid parameters
  const warehouseName = `Warehouse-${RandomGenerator.alphaNumeric(8)}`;
  const warehouseAddress = "123 Warehouse Street, Seoul, South Korea";
  const warehouseCapacity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const warehouseType: ICommunityPlatformWarehouses.ICreate["warehouse_type"] =
    "fulfillment";
  const securityLevel: ICommunityPlatformWarehouses.ICreate["security_level"] =
    "high";
  const lat = 37.5665; // Seoul approximation
  const lng = 126.978;
  const size: ICommunityPlatformWarehouses.ICreate["size"] = "medium";
  const region = "Asia-Pacific";
  const timezone = "Asia/Seoul";
  const contactPhone = RandomGenerator.mobile("+82");
  const carrierIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const warehouse = await generate_random_community_platform_warehouses_create(
    adminConnection,
    {
      body: {
        name: warehouseName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        address: warehouseAddress,
        capacity: warehouseCapacity,
        current_occupancy: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(), // Added required property
        is_active: true,
        warehouse_type: warehouseType,
        security_level: securityLevel,
        lat,
        lng,
        size,
        region,
        timezone,
        contact_email: adminEmail,
        contact_phone: contactPhone,
        carrier_integration_ids: carrierIds,
        temperature_control: true,
        humidity_control: false,
      } satisfies ICommunityPlatformWarehouses.ICreate,
    },
  );
  // Step 3: Validate warehouse creation response
  typia.assert(warehouse);
  // Validate response properties against provided values
  TestValidator.equals(
    "warehouse name matches input",
    warehouse.name,
    warehouseName,
  );
  TestValidator.equals(
    "warehouse location matches address",
    warehouse.location,
    warehouseAddress,
  );
  TestValidator.equals(
    "warehouse capacity matches input",
    warehouse.capacity,
    warehouseCapacity,
  );
  TestValidator.equals(
    "warehouse operational status is active",
    warehouse.operational_status,
    "active",
  );
  TestValidator.equals(
    "warehouse warehouse type matches input",
    warehouse.warehouse_type,
    warehouseType,
  );
  TestValidator.equals(
    "warehouse security level matches input",
    warehouse.security_level,
    securityLevel,
  );
  TestValidator.equals("warehouse size matches input", warehouse.size, size);
  TestValidator.equals(
    "warehouse region matches input",
    warehouse.region,
    region,
  );
  TestValidator.equals(
    "warehouse timezone matches input",
    warehouse.timezone,
    timezone,
  );
  TestValidator.equals(
    "warehouse contact email matches admin email",
    warehouse.contact_email,
    adminEmail,
  );
  TestValidator.equals(
    "warehouse contact phone matches input",
    warehouse.contact_phone,
    contactPhone,
  );
  TestValidator.equals(
    "warehouse temperature control matches input",
    warehouse.temperature_control,
    true,
  );
  TestValidator.equals(
    "warehouse humidity control matches input",
    warehouse.humidity_control,
    false,
  );
  // Validate array of carrier integration IDs
  TestValidator.predicate(
    "warehouse has exactly 2 carrier IDs",
    warehouse.carrier_integration_ids.length === 2,
  );
  TestValidator.predicate(
    "first carrier ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      warehouse.carrier_integration_ids[0],
    ),
  );
  TestValidator.predicate(
    "second carrier ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      warehouse.carrier_integration_ids[1],
    ),
  );
  // Validate lat lng ranges
  TestValidator.predicate(
    "warehouse lat is within valid range",
    warehouse.lat >= -90 && warehouse.lat <= 90,
  );
  TestValidator.predicate(
    "warehouse lng is within valid range",
    warehouse.lng >= -180 && warehouse.lng <= 180,
  );
  // Validate ID is UUID format
  TestValidator.predicate(
    "warehouse ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      warehouse.id,
    ),
  );
  // Validate description length
  TestValidator.predicate(
    "warehouse description has 0-500 characters",
    warehouse.description.length >= 0 && warehouse.description.length <= 500,
  );
  // Validate name length
  TestValidator.predicate(
    "warehouse name has 1-100 characters",
    warehouse.name.length >= 1 && warehouse.name.length <= 100,
  );
  // Validate location length
  TestValidator.predicate(
    "warehouse location has 1-255 characters",
    warehouse.location.length >= 1 && warehouse.location.length <= 255,
  );
  // Validate region length
  TestValidator.predicate(
    "warehouse region has 2-50 characters",
    warehouse.region.length >= 2 && warehouse.region.length <= 50,
  );
  // Validate contact phone E.164 format
  TestValidator.predicate(
    "warehouse contact phone is E.164 format",
    /^\+?[1-9]\d{1,14}$/.test(warehouse.contact_phone),
  );
  // Validate all warehouse_type variants are correct
  TestValidator.predicate(
    "warehouse warehouse_type is valid",
    ["distribution", "fulfillment", "storage", "crossdock"].includes(
      warehouse.warehouse_type,
    ),
  );
  // Validate all security_level variants are correct
  TestValidator.predicate(
    "warehouse security_level is valid",
    ["standard", "high", "critical"].includes(warehouse.security_level),
  );
  // Validate all size variants are correct
  TestValidator.predicate(
    "warehouse size is valid",
    ["small", "medium", "large", "enterprise"].includes(warehouse.size),
  );
  // Validate timezone is valid IANA timezone
  TestValidator.predicate(
    "warehouse timezone is valid IANA timezone",
    /[Aa]sia\/([Ss]eoul)|America\/New_York|Europe\/London|Pacific\/Honolulu|Australia\/Sydney|Asia\/Tokyo|Asia\/Shanghai|Asia\/Singapore|Europe\/Paris|Asia\/Seoul|America\/Los_Angeles/i.test(
      warehouse.timezone,
    ),
  );
  // Validate contact email is valid
  TestValidator.predicate(
    "warehouse contact email is valid format",
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
      warehouse.contact_email,
    ),
  );
}
