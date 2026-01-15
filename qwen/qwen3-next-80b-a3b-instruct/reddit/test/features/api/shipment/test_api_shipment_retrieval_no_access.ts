import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_shipment_retrieval_no_access(
  connection: api.IConnection,
): Promise<void> {
  // Create first member (unauthorized user)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Remove obsolete first unauthorizedMember declaration
  const unauthorizedPasswordPlain = RandomGenerator.alphaNumeric(16);
  const unauthorizedEmail = typia.random<string & tags.Format<"email">>();
  const unauthorizedMember = await authorize_member_join(
    unauthorizedConnection,
    {
      body: {
        email: unauthorizedEmail,
        password: unauthorizedPasswordPlain,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(unauthorizedMember);
  
  // Create second member (shipment owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerPasswordPlain = RandomGenerator.alphaNumeric(16);
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerMember = await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPasswordPlain,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerMember);
  
  // Create an order with the owner member (this generates a shipment)
  const order = await generate_random_community_platform_member_orders_create(
    ownerConnection,
    {
      body: {
        cartId: typia.random<string & tags.Format<"uuid">>(),
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        billing_address_id: typia.random<string & tags.Format<"uuid">>(),
        delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
        carrier_id: typia.random<string & tags.Format<"uuid">>(),
        shipping_method: RandomGenerator.name(),
        currency_code: "KRW",
      },
    },
  );
  typia.assert(order);
  
  // Now login as unauthorized member to create a valid session
  const unauthorizedLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_member_login(unauthorizedLoginConnection, {
    body: {
      email: unauthorizedEmail,
      password: unauthorizedPasswordPlain,
    },
  });
  
  // Try to retrieve the shipment with the unauthorized member's connection
  // Using order.id as shipmentId based on business logic assumption that they're the same
  await TestValidator.error(
    "unauthorized member cannot access shipment",
    async () => {
      await api.functional.communityPlatform.shipments.at(
        unauthorizedLoginConnection,
        {
          shipmentId: order.id,
        },
      );
    },
  );
}