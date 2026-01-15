import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformWarehouses } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformWarehouses";
import { prepare_random_community_platform_warehouses } from "../../../prepare/prepare_random_community_platform_warehouses";
import { generate_random_community_platform_warehouses_create } from "../../../generate/generate_random_community_platform_warehouses_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_warehouse_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // memberConnection.headers now contains the authorization token
  // Step 2: Create a warehouse using the generation function with memberConnection
  const warehouse: ICommunityPlatformWarehouses =
    await generate_random_community_platform_warehouses_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          capacity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
          warehouse_type: "fulfillment" as const,
          security_level: "standard" as const,
          lat: typia.random<number & tags.Minimum<-90> & tags.Maximum<90>>(),
          lng: typia.random<number & tags.Minimum<-180> & tags.Maximum<180>>(),
          size: "medium" as const,
          region: "Asia-Pacific",
          timezone: "Asia/Seoul",
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile("+82"),
          carrier_integration_ids: [
            typia.random<string & tags.Format<"uuid">>(),
            typia.random<string & tags.Format<"uuid">>(),
          ],
          temperature_control: false,
          humidity_control: false,
          current_occupancy: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
          address: RandomGenerator.paragraph({ sentences: 1 }), // Add required address property
        } satisfies ICommunityPlatformWarehouses.ICreate,
      },
    );
  typia.assert(warehouse);
  // Step 3: Retrieve the warehouse details using the SDK function with memberConnection
  const retrievedWarehouse: ICommunityPlatformWarehouses =
    await api.functional.communityPlatform.member.warehouses.at(
      memberConnection,
      {
        warehouseId: warehouse.id,
      },
    );
  typia.assert(retrievedWarehouse);
  // Step 4: Validate that retrieved warehouse matches created warehouse
  TestValidator.equals(
    "warehouse ID matches",
    retrievedWarehouse.id,
    warehouse.id,
  );
  TestValidator.equals(
    "warehouse name matches",
    retrievedWarehouse.name,
    warehouse.name,
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
    "warehouse carrier integrations match",
    retrievedWarehouse.carrier_integration_ids.sort(),
    warehouse.carrier_integration_ids.sort(),
  );
  TestValidator.equals(
    "warehouse contact email matches",
    retrievedWarehouse.contact_email,
    warehouse.contact_email,
  );
  TestValidator.equals(
    "warehouse timezone matches",
    retrievedWarehouse.timezone,
    warehouse.timezone,
  );
  TestValidator.equals(
    "warehouse region matches",
    retrievedWarehouse.region,
    warehouse.region,
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
    "warehouse type matches",
    retrievedWarehouse.warehouse_type,
    warehouse.warehouse_type,
  );
  TestValidator.equals(
    "warehouse security level matches",
    retrievedWarehouse.security_level,
    warehouse.security_level,
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
    "warehouse description matches",
    retrievedWarehouse.description,
    warehouse.description,
  );
  TestValidator.equals(
    "warehouse size matches",
    retrievedWarehouse.size,
    warehouse.size,
  );
}