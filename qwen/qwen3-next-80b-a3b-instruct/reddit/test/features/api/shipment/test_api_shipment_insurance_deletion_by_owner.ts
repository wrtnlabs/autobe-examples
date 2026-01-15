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
import type { ICommunityPlatformShipmentInsurance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentInsurance";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_insurance } from "../../../prepare/prepare_random_community_platform_shipment_insurance";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_member_shipments_insurances_create } from "../../../generate/generate_random_community_platform_member_shipments_insurances_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_insurance_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to establish context for shipment creation
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create a shipment that will have an insurance policy
  const shipment: ICommunityPlatformShipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Test shipment for insurance deletion",
          packages: ArrayUtil.repeat(
            1,
            () =>
              ({
                shipment_id: typia.random<string & tags.Format<"uuid">>(), // Fixed: Generate UUID instead of referencing undefined variable
                product_id: typia.random<string & tags.Format<"uuid">>(), // Generate random product_id
                quantity: 1,
                weight_grams: 500,
                tracking_number: RandomGenerator.alphaNumeric(15),
                carrier_id: typia.random<string & tags.Format<"uuid">>(),
                insurance_value_usd: 500,
                special_instructions: "Handle with care",
              }) satisfies ICommunityPlatformShipmentPackage.ICreate,
          ),
          shipment_type: "standard",
          exception_handling: "hold",
          signature_required: true,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 3: Create insurance policy for the shipment
  const insurance: ICommunityPlatformShipmentInsurance =
    await generate_random_community_platform_member_shipments_insurances_create(
      memberConnection,
      {
        body: {
          coverage_limit: 1000,
          premium_amount: 25,
          policy_number: "INS-2026-0001",
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
        } satisfies ICommunityPlatformShipmentInsurance.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  typia.assert(insurance);
  // Step 4: Delete the insurance policy by owner
  await api.functional.communityPlatform.member.shipments.insurances.erase(
    memberConnection,
    {
      shipmentId: shipment.id,
      insuranceId: insurance.id,
    },
  );
  // Step 5: Verification
  // Since there is no 'at' endpoint to retrieve insurance policies after deletion,
  // we cannot verify deletion by attempting to retrieve the insurance.
  // The only verification we can do is that the DELETE call succeeded without error.
  // The API specification confirms that delete returns 204 No Content on success.
  // No additional verification is possible based on available endpoints.
}
