import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member who will own the shipment
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const owner: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(ownerConnection, { body: ownerCredentials });
  // Step 2: Create a shipment owned by the authenticated member
  const packageItem: ICommunityPlatformShipmentPackage.ICreate = {
    shipment_id: typia.random<string & tags.Format<"uuid">>(), // Will be ignored by server; backend generates real shipment_id
    product_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    weight_grams: 500,
    tracking_number: RandomGenerator.alphaNumeric(15),
    carrier_id: typia.random<string & tags.Format<"uuid">>(),
    insurance_value_usd: 100,
    special_instructions: "", // Required only if present
  };
  const shipment: ICommunityPlatformShipment =
    await api.functional.communityPlatform.member.shipments.create(
      ownerConnection,
      {
        body: {
          packages: [packageItem],
          shipment_type: "standard",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 3: Authenticate as a different member (non-owner)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  await authorize_member_join(nonOwnerConnection, {
    body: nonOwnerCredentials,
  });
  // Step 4: Attempt to delete the shipment with non-owner - should fail with 403/404
  await TestValidator.error("non-owner cannot delete shipment", async () => {
    await api.functional.communityPlatform.member.shipments.erase(
      nonOwnerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  });
  // Step 5: Delete the shipment with the owner - should succeed
  await api.functional.communityPlatform.member.shipments.erase(
    ownerConnection,
    {
      shipmentId: shipment.id,
    },
  );
}
