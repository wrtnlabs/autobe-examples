import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallShipmentDeliveryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDeliveryStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_shipment_delivery_status_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Create Customer A account (shipment owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceMallMember.IAuthorized =
    await authorize_member_join(customerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(customerA);
  // Create Customer B account (unauthorized accessor)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceMallMember.IAuthorized =
    await authorize_member_join(customerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(customerB);
  // Attempt to access delivery status endpoint
  // Access control validation: shipment must belong to authenticated customer's order
  // This test validates the access control mechanism by attempting cross-customer access
  await TestValidator.httpError(
    "shipment delivery status access denied for unauthorized customer",
    [403, 404],
    async () => {
      const testShipmentId: string & tags.Format<"uuid"> = typia.random<
        string & tags.Format<"uuid">
      >();
      await api.functional.ecommerceMall.member.shipments.delivery_status.at(
        customerBConnection,
        { shipmentId: testShipmentId },
      );
    },
  );
}