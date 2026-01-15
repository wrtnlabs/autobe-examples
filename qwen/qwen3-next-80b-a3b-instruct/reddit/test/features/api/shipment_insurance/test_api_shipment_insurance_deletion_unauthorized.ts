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
export async function test_api_shipment_insurance_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create first member connection and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Data: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  };
  await authorize_member_join(member1Connection, { body: member1Data });
  // Create shipment for member1
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      member1Connection,
      {},
    );
  typia.assert(shipment);
  // Create insurance for shipment
  const insurance =
    await generate_random_community_platform_member_shipments_insurances_create(
      member1Connection,
      {
        params: { shipmentId: shipment.id },
        body: {
          coverage_limit: 5000,
          premium_amount: 50,
          policy_number: `INS-${Date.now()}-001`,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        },
      },
    );
  typia.assert(insurance);
  // Create second member connection and authenticate
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Data: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  };
  await authorize_member_join(member2Connection, { body: member2Data });
  // Attempt unauthorized deletion of insurance by member2
  await TestValidator.error(
    "should return 403 Forbidden for unauthorized deletion",
    async () => {
      await api.functional.communityPlatform.member.shipments.insurances.erase(
        member2Connection,
        {
          shipmentId: shipment.id,
          insuranceId: insurance.id,
        },
      );
    },
  );
}
